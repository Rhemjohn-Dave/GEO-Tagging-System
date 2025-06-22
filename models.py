from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    elevation = db.Column(db.Float, default=0)
    rainfall_history = db.Column(db.JSON, default=list)
    average_rainfall = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    weather_data = db.relationship('WeatherData', backref='location', uselist=False)
    risk_assessments = db.relationship('RiskAssessment', backref='location', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'description': self.description,
            'elevation': self.elevation,
            'rainfall_history': self.rainfall_history,
            'average_rainfall': self.average_rainfall,
            'weather_data': self.weather_data.to_dict() if self.weather_data else None,
            'risk_level': self.risk_assessments[-1].risk_level if self.risk_assessments else None,
            'timestamp': self.updated_at.isoformat() if self.updated_at else None
        }

class WeatherData(db.Model):
    __tablename__ = 'weather_data'
    
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    rainfall = db.Column(db.Float, default=0)
    water_level = db.Column(db.Float, default=0)
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    wind_speed = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'location_id': self.location_id,
            'rainfall': self.rainfall,
            'water_level': self.water_level,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'wind_speed': self.wind_speed,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class RiskAssessment(db.Model):
    __tablename__ = 'risk_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)  # 'low', 'medium', 'high'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'location_id': self.location_id,
            'risk_level': self.risk_level,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        } 