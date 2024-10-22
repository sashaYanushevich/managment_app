from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base_class import Base

class Package(Base):
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("user.id"))
    comment = Column(String(255))
    max_modems = Column(Integer)
    start_date = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    expiry = Column(DateTime(timezone=True))

    customer = relationship("User", back_populates="packages")
    servers = relationship("Server", back_populates="package", cascade="all, delete-orphan")
