from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base_class import Base

class Server(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    max_modems = Column(Integer, nullable=False)
    package_id = Column(Integer, ForeignKey('package.id'), nullable=False)
    license_hash = Column(String(100), nullable=True)
    machine_data = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    package = relationship("Package", back_populates="servers")
