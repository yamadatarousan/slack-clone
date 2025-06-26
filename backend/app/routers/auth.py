from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging

from app.database.base import get_db
from app.database.models import User, Channel, channel_members
from app.core.config import settings
from app.models.user import UserCreate, UserResponse, UserLogin, Token

logger = logging.getLogger(__name__)

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_user_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> User:
    return db.query(User).filter(User.username == username).first()


def authenticate_user(db: Session, username: str, password: str) -> User:
    user = get_user_by_username(db, username)
    if not user:
        user = get_user_by_email(db, username)  # Allow login with email
    if not user or not verify_password(password, user.password_hash):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Registration attempt for user: {user.username}, email: {user.email}")
        
        # Check if user already exists
        db_user = get_user_by_email(db, email=user.email)
        if db_user:
            logger.warning(f"Registration failed: Email {user.email} already registered")
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        db_user = get_user_by_username(db, username=user.username)
        if db_user:
            logger.warning(f"Registration failed: Username {user.username} already taken")
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
        
        # Create new user
        logger.info(f"Creating new user: {user.username}")
        hashed_password = get_password_hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email,
            password_hash=hashed_password,
            display_name=user.display_name or user.username
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Add user to default general channel
        general_channel = db.query(Channel).filter(Channel.name == "general").first()
        if general_channel:
            # Check if user is not already a member
            existing_membership = db.execute(
                channel_members.select().where(
                    channel_members.c.user_id == db_user.id,
                    channel_members.c.channel_id == general_channel.id
                )
            ).first()
            
            if not existing_membership:
                db.execute(
                    channel_members.insert().values(
                        user_id=db_user.id,
                        channel_id=general_channel.id,
                        role='member'
                    )
                )
                db.commit()
                logger.info(f"User {user.username} added to general channel")
        
        logger.info(f"User {user.username} registered successfully with ID: {db_user.id}")
        return db_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during registration for {user.username}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Internal server error during registration"
        )


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user