// Social Media Sharing Functions
class SocialMediaSharing {
    constructor() {
        this.platforms = {
            facebook: {
                name: 'Facebook',
                icon: 'fab fa-facebook',
                color: '#1877f2',
                shareUrl: 'https://www.facebook.com/sharer/sharer.php'
            },
            twitter: {
                name: 'Twitter',
                icon: 'fab fa-twitter',
                color: '#1da1f2',
                shareUrl: 'https://twitter.com/intent/tweet'
            },
            whatsapp: {
                name: 'WhatsApp',
                icon: 'fab fa-whatsapp',
                color: '#25d366',
                shareUrl: 'https://wa.me/'
            },
            telegram: {
                name: 'Telegram',
                icon: 'fab fa-telegram',
                color: '#0088cc',
                shareUrl: 'https://t.me/share/url'
            },
            email: {
                name: 'Email',
                icon: 'fas fa-envelope',
                color: '#ea4335',
                shareUrl: 'mailto:'
            }
        };
    }

    // Generate shareable text from location data
    generateShareText(shareData) {
        const location = shareData.location;
        const weather = shareData.weather;
        const risk = shareData.risk;
        
        let text = `📍 ${location.name}\n`;
        text += `🌍 Coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}\n`;
        
        if (weather && Object.keys(weather).length > 0) {
            text += `🌤️ Current Weather: ${weather.temp}°C, ${weather.condition}\n`;
            text += `💧 Humidity: ${weather.humidity}%\n`;
            text += `💨 Wind: ${weather.wind_speed} km/h\n`;
        }
        
        if (risk && risk.risk_level) {
            text += `⚠️ Flood Risk: ${risk.risk_level.toUpperCase()}\n`;
            if (risk.water_level) {
                text += `🌊 Water Level: ${risk.water_level.toFixed(2)}m\n`;
            }
        }
        
        return text;
    }

    // Share to Facebook
    shareToFacebook(shareData) {
        const text = encodeURIComponent(this.generateShareText(shareData));
        const shareUrl = `${this.platforms.facebook.shareUrl}?quote=${text}`;
        this.openShareWindow(shareUrl, 'facebook');
    }

    // Share to Twitter
    shareToTwitter(shareData) {
        const text = encodeURIComponent(this.generateShareText(shareData));
        const shareUrl = `${this.platforms.twitter.shareUrl}?text=${text}`;
        this.openShareWindow(shareUrl, 'twitter');
    }

    // Share to WhatsApp
    shareToWhatsApp(shareData) {
        const text = encodeURIComponent(this.generateShareText(shareData));
        const shareUrl = `${this.platforms.whatsapp}?text=${text}`;
        this.openShareWindow(shareUrl, 'whatsapp');
    }

    // Share to Telegram
    shareToTelegram(shareData) {
        const text = encodeURIComponent(this.generateShareText(shareData));
        const shareUrl = `${this.platforms.telegram}?text=${text}`;
        this.openShareWindow(shareUrl, 'telegram');
    }

    // Share via Email
    shareViaEmail(shareData) {
        const subject = encodeURIComponent(`Location Data: ${shareData.location.name}`);
        const body = encodeURIComponent(this.generateShareText(shareData));
        const shareUrl = `${this.platforms.email}?subject=${subject}&body=${body}`;
        window.location.href = shareUrl;
    }

    // Copy to clipboard
    async copyToClipboard(shareData) {
        const text = this.generateShareText(shareData);
        
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Copied to clipboard!', 'success');
        }
    }

    // Open share window
    openShareWindow(url, platform) {
        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        window.open(
            url,
            `share-${platform}`,
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Create sharing buttons HTML
    createSharingButtons(shareData) {
        let buttonsHtml = '<div class="sharing-buttons">';
        buttonsHtml += '<h6 class="sharing-title"><i class="fas fa-share-alt me-2"></i>Share Location</h6>';
        buttonsHtml += '<div class="sharing-grid">';
        
        Object.keys(this.platforms).forEach(platform => {
            const platformData = this.platforms[platform];
            buttonsHtml += `
                <button class="share-btn share-btn-${platform}" 
                        onclick="socialSharing.shareTo${platform.charAt(0).toUpperCase() + platform.slice(1)}(${JSON.stringify(shareData).replace(/"/g, '&quot;')})"
                        title="Share on ${platformData.name}">
                    <i class="${platformData.icon}"></i>
                </button>
            `;
        });
        
        buttonsHtml += `
            <button class="share-btn share-btn-copy" 
                    onclick="socialSharing.copyToClipboard(${JSON.stringify(shareData).replace(/"/g, '&quot;')})"
                    title="Copy to clipboard">
                <i class="fas fa-copy"></i>
            </button>
        `;
        
        buttonsHtml += '</div></div>';
        return buttonsHtml;
    }

    // Fetch share data for a location
    async fetchShareData(locationId) {
        try {
            const response = await fetch(`/api/share-location/${locationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch share data');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching share data:', error);
            this.showNotification('Failed to load sharing data', 'error');
            return null;
        }
    }
}

// Initialize social sharing
const socialSharing = new SocialMediaSharing();

// Global function to add sharing buttons to a popup
async function addSharingToPopup(locationId, popupElement) {
    const shareData = await socialSharing.fetchShareData(locationId);
    if (shareData) {
        const sharingButtons = socialSharing.createSharingButtons(shareData);
        popupElement.innerHTML += sharingButtons;
    }
} 