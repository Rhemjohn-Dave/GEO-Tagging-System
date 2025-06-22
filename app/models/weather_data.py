from datetime import datetime
from app import db

class WeatherData(db.Model):
    __tablename__ = 'weather_data'
    
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    rainfall = db.Column(db.Float)  # in mm
    water_level = db.Column(db.Float)  # in meters
    temperature = db.Column(db.Float)  # in Celsius
    humidity = db.Column(db.Float)  # percentage
    wind_speed = db.Column(db.Float)  # in km/h
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
            'timestamp': self.timestamp.isoformat()
        } 