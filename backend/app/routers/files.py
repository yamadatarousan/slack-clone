from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import os
import uuid
import mimetypes
from pathlib import Path
from typing import Dict
import logging

from app.routers.auth import get_current_user
from app.database.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

# ファイルアップロード設定
UPLOAD_DIRECTORY = Path("uploads")
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

# 許可されるファイル拡張子とMIMEタイプ
ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp',  # 画像
    '.pdf', '.txt',  # ドキュメント
    '.doc', '.docx', '.xls', '.xlsx'  # Office
}

ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def validate_file(file: UploadFile) -> None:
    """ファイルのバリデーション"""
    # ファイルサイズチェック
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"ファイルサイズが大きすぎます。最大 {MAX_FILE_SIZE // (1024*1024)}MB まで対応しています。"
        )
    
    # MIMEタイプチェック
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="サポートされていないファイル形式です。"
        )
    
    # 拡張子チェック
    if file.filename:
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="サポートされていないファイル拡張子です。"
            )

def get_safe_filename(filename: str) -> str:
    """安全なファイル名を生成"""
    # UUIDを使ってユニークなファイル名を生成
    file_extension = Path(filename).suffix.lower()
    safe_name = f"{uuid.uuid4()}{file_extension}"
    return safe_name

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """ファイルをアップロード"""
    try:
        # ファイルバリデーション
        validate_file(file)
        
        # 安全なファイル名を生成
        safe_filename = get_safe_filename(file.filename or "unknown")
        file_path = UPLOAD_DIRECTORY / safe_filename
        
        # ファイルを保存
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # ファイルURLを生成
        file_url = f"/files/{safe_filename}"
        
        logger.info(f"File uploaded: {safe_filename} by user {current_user.id}")
        
        return {"file_url": file_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="ファイルのアップロードに失敗しました。"
        )

@router.get("/{filename}")
async def download_file(filename: str):
    """ファイルをダウンロード"""
    file_path = UPLOAD_DIRECTORY / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません。")
    
    # MIMEタイプを推定
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if mime_type is None:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename
    )

@router.delete("/{filename}")
async def delete_file(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """ファイルを削除"""
    file_path = UPLOAD_DIRECTORY / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません。")
    
    try:
        os.remove(file_path)
        logger.info(f"File deleted: {filename} by user {current_user.id}")
        return {"message": "ファイルが削除されました。"}
    except Exception as e:
        logger.error(f"File deletion error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="ファイルの削除に失敗しました。"
        )