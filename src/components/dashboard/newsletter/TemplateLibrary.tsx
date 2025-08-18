import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Users, 
  Wrench, 
  Star, 
  FileText, 
  Plus 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useNewsletterStore } from './useNewsletterStore';

// Tire service header template
const TIRE_HEADER_TEMPLATE = {
  id: 'tire-header',
  type: 'html' as const,
  content: { 
    html: `
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); padding: 24px; text-align: center;">
        <img src="/placeholder.svg" alt="{{company_name}} Logo" style="height: 48px; margin-bottom: 16px;" />
        <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">{{company_name}}</h1>
        <p style="color: #e2e8f0; font-size: 14px; margin: 8px 0 0 0;">Your trusted tire & automotive service partner</p>
      </div>
    `
  },
  styles: { margin: '0', padding: '0' }
};

// Tire service footer template
const TIRE_FOOTER_TEMPLATE = {
  id: 'tire-footer',
  type: 'html' as const,
  content: { 
    html: `
      <div style="background: #f8fafc; padding: 32px 24px; border-top: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="#" style="color: #1e40af; text-decoration: none; margin: 0 16px; font-weight: 500;">Tire Services</a>
          <a href="#" style="color: #1e40af; text-decoration: none; margin: 0 16px; font-weight: 500;">Book Appointment</a>
          <a href="#" style="color: #1e40af; text-decoration: none; margin: 0 16px; font-weight: 500;">Storage Options</a>
          <a href="#" style="color: #1e40af; text-decoration: none; margin: 0 16px; font-weight: 500;">Contact</a>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <p style="color: #64748b; font-size: 14px; margin: 8px 0;">📍 {{company_address}}</p>
          <p style="color: #64748b; font-size: 14px; margin: 8px 0;">📞 {{company_phone}} | 📧 {{company_email}}</p>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0;">Open Mon-Fri 8AM-6PM, Sat 9AM-4PM</p>
        </div>
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #cbd5e1;">
          <a href="{{unsubscribe_url}}" style="color: #dc2626; text-decoration: none; font-size: 12px;">Unsubscribe from tire service updates</a>
        </div>
      </div>
    `
  },
  styles: { margin: '0', padding: '0' }
};

const TEMPLATE_BLOCKS = {
  // INFORMATIONAL TEMPLATES
  'tire-winter-safety': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'winter-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #93c5fd 100%); padding: 48px 24px; text-align: center; color: white; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="white" opacity="0.3"/><circle cx="80" cy="40" r="1.5" fill="white" opacity="0.5"/><circle cx="60" cy="70" r="1" fill="white" opacity="0.4"/></svg>') repeat; opacity: 0.3;"></div>
            <div style="position: relative; z-index: 1;">
              <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">❄️ Winter Tire Safety Guide</h1>
              <p style="font-size: 18px; margin: 0; opacity: 0.9;">Essential tips to keep you safe on winter roads</p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'winter-intro',
      type: 'text' as const,
      content: { text: 'Hello {{first_name}}, as winter approaches, ensuring your {{vehicle_type}} is equipped with proper winter tires becomes crucial for your safety and the safety of your loved ones.', tag: 'p' },
      styles: { fontSize: '16px', color: '#374151', textAlign: 'left', margin: '0', padding: '32px 24px 16px 24px', lineHeight: '1.6' }
    },
    {
      id: 'safety-checklist',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 0 24px 32px 24px;">
            <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 24px 0; border-bottom: 3px solid #dbeafe; padding-bottom: 8px;">🔍 Pre-Winter Safety Checklist</h2>
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border-left: 4px solid #3b82f6;">
              <div style="margin-bottom: 16px;">
                <span style="background: #1e40af; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;">✓</span>
                <strong style="color: #1e40af; margin-left: 8px;">Tread Depth:</strong>
                <span style="color: #374151;"> Minimum 4mm for winter conditions (legal minimum is 1.6mm)</span>
              </div>
              <div style="margin-bottom: 16px;">
                <span style="background: #1e40af; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;">✓</span>
                <strong style="color: #1e40af; margin-left: 8px;">Tire Pressure:</strong>
                <span style="color: #374151;"> Check monthly - cold weather reduces pressure</span>
              </div>
              <div>
                <span style="background: #1e40af; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;">✓</span>
                <strong style="color: #1e40af; margin-left: 8px;">Professional Installation:</strong>
                <span style="color: #374151;"> Proper mounting and balancing for optimal performance</span>
              </div>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'winter-cta',
      type: 'button' as const,
      content: { text: '📅 Book Winter Tire Change', href: '#', target: '_blank' },
      styles: { backgroundColor: '#1e40af', color: '#ffffff', borderRadius: '8px', padding: '16px 32px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none', boxShadow: '0 4px 15px rgba(30, 64, 175, 0.3)' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  'tire-spring-maintenance': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'spring-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #059669 0%, #6ee7b7 100%); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🌱 Spring Tire Transition Guide</h1>
            <p style="font-size: 18px; margin: 0; opacity: 0.9;">Time to switch back to summer tires and maintain your vehicle</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'spring-content',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi {{first_name}}, spring is here! Time to transition your {{vehicle_type}} back to summer tires and give your winter tires the care they deserve during storage.
            </p>
            
            <h3 style="color: #059669; font-size: 20px; margin: 0 0 16px 0;">🧼 Proper Winter Tire Storage</h3>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Clean thoroughly:</strong> Remove salt, dirt, and debris with machine washing</li>
                <li><strong>Dry storage:</strong> Store in cool, dark, dry environment away from UV rays</li>
                <li><strong>Proper positioning:</strong> Stack flat or hang to maintain shape</li>
                <li><strong>Insurance coverage:</strong> Protect your investment with tire insurance</li>
              </ul>
            </div>
            
            <h3 style="color: #059669; font-size: 20px; margin: 0 0 16px 0;">🔧 Spring Vehicle Maintenance</h3>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Perfect time for comprehensive vehicle inspection, alignment check, and general maintenance.
            </p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'spring-cta',
      type: 'button' as const,
      content: { text: '🌸 Schedule Spring Change & Storage', href: '#', target: '_blank' },
      styles: { backgroundColor: '#059669', color: '#ffffff', borderRadius: '8px', padding: '16px 32px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  'tire-midseason-check': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'check-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #dc2626 0%, #fca5a5 100%); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🔍 Mid-Season Tire Health Check</h1>
            <p style="font-size: 18px; margin: 0; opacity: 0.9;">Keep your tires in optimal condition year-round</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'health-check-content',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hello {{first_name}}, regular tire maintenance extends tire life and ensures optimal safety for your {{vehicle_type}}. Our professional inspections catch issues before they become costly problems.
            </p>
            
            <div style="background: #fef2f2; padding: 24px; border-radius: 12px; border-left: 4px solid #dc2626; margin-bottom: 24px;">
              <h3 style="color: #dc2626; font-size: 20px; margin: 0 0 16px 0;">⚠️ Warning Signs to Watch For</h3>
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; align-items: start;">
                  <span style="color: #dc2626; margin-right: 8px;">•</span>
                  <span style="color: #374151;">Uneven tread wear patterns</span>
                </div>
                <div style="display: flex; align-items: start;">
                  <span style="color: #dc2626; margin-right: 8px;">•</span>
                  <span style="color: #374151;">Vibration while driving</span>
                </div>
                <div style="display: flex; align-items: start;">
                  <span style="color: #dc2626; margin-right: 8px;">•</span>
                  <span style="color: #374151;">Frequent pressure loss</span>
                </div>
                <div style="display: flex; align-items: start;">
                  <span style="color: #dc2626; margin-right: 8px;">•</span>
                  <span style="color: #374151;">Sidewall cracks or bulges</span>
                </div>
              </div>
            </div>
            
            <div style="background: #eff6ff; padding: 24px; border-radius: 12px;">
              <h3 style="color: #1e40af; font-size: 18px; margin: 0 0 12px 0;">📊 Our Digital Inspection Includes:</h3>
              <p style="color: #374151; margin: 0; line-height: 1.6;">
                Digital tread depth measurements, pressure optimization, wear pattern analysis, and rotation recommendations with detailed reporting.
              </p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'check-cta',
      type: 'button' as const,
      content: { text: '🔧 Book Free Inspection', href: '#', target: '_blank' },
      styles: { backgroundColor: '#dc2626', color: '#ffffff', borderRadius: '8px', padding: '16px 32px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  'tire-yearround-care': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'care-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #c4b5fd 100%); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🛡️ Year-Round Tire Care Guide</h1>
            <p style="font-size: 18px; margin: 0; opacity: 0.9;">Maximize tire life with proper maintenance and storage</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'care-tips',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
              Dear {{first_name}}, proper tire care protects your investment and ensures your {{vehicle_type}} performs safely in all conditions. Follow these expert recommendations for maximum tire longevity.
            </p>
            
            <div style="display: grid; gap: 24px; margin-bottom: 32px;">
              <div style="background: #faf5ff; padding: 24px; border-radius: 12px; border-left: 4px solid #7c3aed;">
                <h3 style="color: #7c3aed; font-size: 18px; margin: 0 0 12px 0;">🌡️ Optimal Storage Conditions</h3>
                <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Temperature: 10-25°C (50-77°F)</li>
                  <li>Humidity: Below 70% relative humidity</li>
                  <li>UV Protection: Away from direct sunlight</li>
                  <li>Clean environment: Free from oils and chemicals</li>
                </ul>
              </div>
              
              <div style="background: #f0fdf4; padding: 24px; border-radius: 12px; border-left: 4px solid #10b981;">
                <h3 style="color: #10b981; font-size: 18px; margin: 0 0 12px 0;">📅 Maintenance Schedule</h3>
                <div style="color: #374151; line-height: 1.6;">
                  <div style="margin-bottom: 8px;"><strong>Monthly:</strong> Pressure check & visual inspection</div>
                  <div style="margin-bottom: 8px;"><strong>Seasonal:</strong> Professional inspection & rotation</div>
                  <div><strong>Annual:</strong> Comprehensive tread depth measurement</div>
                </div>
              </div>
            </div>
            
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #fbbf24;">
              <p style="color: #92400e; margin: 0; font-weight: 500;">
                💡 Pro Tip: Our automated SMS reminders ensure you never miss important maintenance dates!
              </p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'care-cta',
      type: 'button' as const,
      content: { text: '📋 Set Up Maintenance Reminders', href: '#', target: '_blank' },
      styles: { backgroundColor: '#7c3aed', color: '#ffffff', borderRadius: '8px', padding: '16px 32px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  // PROMOTIONAL TEMPLATES
  'tire-early-bird-winter': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'early-bird-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(45deg, #dc2626, #f97316); padding: 48px 24px; text-align: center; color: white; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; animation: pulse 2s infinite;"></div>
            <h1 style="font-size: 42px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🐦 EARLY BIRD SPECIAL</h1>
            <p style="font-size: 24px; margin: 0 0 24px 0; opacity: 0.95;">Winter Tire Change</p>
            <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 24px; margin: 24px auto; max-width: 400px;">
              <span style="font-size: 48px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Save 25%</span>
              <p style="margin: 8px 0 0 0; font-size: 16px;">Book before November 1st</p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'early-bird-content',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Hello {{first_name}}, beat the winter rush and save money! Book your {{vehicle_type}} winter tire change early and enjoy priority service with our professional team.
            </p>
            
            <div style="background: #fef2f2; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="color: #dc2626; font-size: 20px; margin: 0 0 16px 0; text-align: center;">⏰ Limited Time Offer</h3>
              <div style="text-align: center; margin-bottom: 16px;">
                <span style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: bold;">SAVE25EARLY</span>
              </div>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>25% off tire change service (book before Nov 1st)</li>
                <li>Priority booking - avoid November wait times</li>
                <li>Professional installation with digital measurements</li>
                <li>Complimentary tread depth inspection</li>
                <li>Free tire pressure optimization</li>
              </ul>
            </div>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="color: #1e40af; margin: 0; font-weight: 500;">
                🎯 Why book early? Our November calendar fills up fast! Secure your spot and enjoy stress-free winter preparation.
              </p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'early-bird-cta',
      type: 'button' as const,
      content: { text: '🎯 Book Now & Save 25%', href: '#', target: '_blank' },
      styles: { backgroundColor: '#dc2626', color: '#ffffff', borderRadius: '30px', padding: '18px 36px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none', boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  'tire-spring-bundle': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'bundle-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🌸 Spring Service Bundle</h1>
            <p style="font-size: 20px; margin: 0; opacity: 0.9;">Complete care package for your vehicle</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'bundle-packages',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
              Hi {{first_name}}, spring is the perfect time to refresh your {{vehicle_type}}! Choose from our comprehensive service bundles designed to keep you safe and your car looking great.
            </p>
            
            <div style="display: grid; gap: 24px; margin-bottom: 32px;">
              <div style="background: #f0fdf4; padding: 24px; border-radius: 12px; border: 2px solid #10b981;">
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">MOST POPULAR</span>
                </div>
                <h3 style="color: #10b981; font-size: 22px; margin: 0 0 12px 0; text-align: center;">🚗 Complete Spring Package</h3>
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="font-size: 32px; font-weight: bold; color: #10b981;">$199</span>
                  <span style="color: #6b7280; text-decoration: line-through; margin-left: 8px;">$259</span>
                </div>
                <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Summer tire installation</li>
                  <li>Winter tire cleaning & storage</li>
                  <li>Premium car wash & wax</li>
                  <li>Wheel alignment check</li>
                  <li>Digital tread measurements</li>
                </ul>
              </div>
              
              <div style="background: #fffbeb; padding: 24px; border-radius: 12px; border: 1px solid #f59e0b;">
                <h3 style="color: #f59e0b; font-size: 20px; margin: 0 0 12px 0; text-align: center;">⚡ Express Package</h3>
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="font-size: 28px; font-weight: bold; color: #f59e0b;">$129</span>
                  <span style="color: #6b7280; text-decoration: line-through; margin-left: 8px;">$169</span>
                </div>
                <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Tire change service</li>
                  <li>Basic cleaning & storage</li>
                  <li>Pressure optimization</li>
                  <li>Visual inspection</li>
                </ul>
              </div>
            </div>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="color: #0369a1; margin: 0; font-weight: 500;">
                🎁 Bonus: Book online and receive a free vehicle interior cleaning (€25 value)!
              </p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'bundle-cta',
      type: 'button' as const,
      content: { text: '🌸 Choose Your Spring Package', href: '#', target: '_blank' },
      styles: { backgroundColor: '#10b981', color: '#ffffff', borderRadius: '8px', padding: '16px 32px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  'tire-loyalty-club': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'loyalty-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">👑 VIP Tire Club Membership</h1>
            <p style="font-size: 18px; margin: 0; opacity: 0.9;">Exclusive benefits for tire care enthusiasts</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'loyalty-benefits',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
              Dear {{first_name}}, join our exclusive VIP Tire Club and enjoy premium benefits designed for smart {{vehicle_type}} owners who value quality service and convenience.
            </p>
            
            <div style="background: #faf5ff; padding: 28px; border-radius: 16px; margin-bottom: 32px; border: 2px solid #7c3aed;">
              <h3 style="color: #7c3aed; font-size: 24px; margin: 0 0 20px 0; text-align: center;">🎖️ Membership Benefits</h3>
              
              <div style="display: grid; gap: 16px;">
                <div style="display: flex; align-items: start; padding: 12px; background: white; border-radius: 8px;">
                  <span style="background: #7c3aed; color: white; padding: 6px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">💾</span>
                  <div>
                    <strong style="color: #7c3aed;">Free Tire Storage</strong>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Climate-controlled facility with insurance coverage</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: start; padding: 12px; background: white; border-radius: 8px;">
                  <span style="background: #7c3aed; color: white; padding: 6px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">📱</span>
                  <div>
                    <strong style="color: #7c3aed;">Automatic SMS Reminders</strong>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Never miss a seasonal change again</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: start; padding: 12px; background: white; border-radius: 8px;">
                  <span style="background: #7c3aed; color: white; padding: 6px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">⭐</span>
                  <div>
                    <strong style="color: #7c3aed;">Priority Booking</strong>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Skip the queue during busy seasons</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: start; padding: 12px; background: white; border-radius: 8px;">
                  <span style="background: #7c3aed; color: white; padding: 6px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">💰</span>
                  <div>
                    <strong style="color: #7c3aed;">Member Discounts</strong>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">15% off all services and new tire purchases</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="background: #ddd6fe; padding: 20px; border-radius: 12px; text-align: center;">
              <p style="color: #5b21b6; margin: 0 0 8px 0; font-weight: bold; font-size: 18px;">Special Launch Offer</p>
              <p style="color: #5b21b6; margin: 0; font-size: 14px;">
                First year membership: <span style="text-decoration: line-through;">€99</span> <strong>FREE</strong> with any service booking!
              </p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'loyalty-cta',
      type: 'button' as const,
      content: { text: '👑 Join VIP Club FREE', href: '#', target: '_blank' },
      styles: { backgroundColor: '#7c3aed', color: '#ffffff', borderRadius: '25px', padding: '18px 36px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none', boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)' }
    },
    TIRE_FOOTER_TEMPLATE
  ],

  'tire-annual-package': [
    TIRE_HEADER_TEMPLATE,
    {
      id: 'annual-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎯 Complete Annual Care Package</h1>
            <p style="font-size: 18px; margin: 0; opacity: 0.9;">Everything your vehicle needs, all year round</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'annual-content',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
              Hello {{first_name}}, simplify your {{vehicle_type}} maintenance with our comprehensive annual package. One payment covers everything your vehicle needs throughout the year.
            </p>
            
            <div style="background: #f9fafb; padding: 32px; border-radius: 16px; border: 2px solid #1f2937; margin-bottom: 32px;">
              <h3 style="color: #1f2937; font-size: 24px; margin: 0 0 24px 0; text-align: center;">📋 Complete Package Includes</h3>
              
              <div style="display: grid; gap: 20px;">
                <div style="background: white; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                  <h4 style="color: #1e40af; font-size: 18px; margin: 0 0 8px 0;">🔄 Seasonal Changes (2x/year)</h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Professional winter/summer tire installation with digital measurements</p>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                  <h4 style="color: #059669; font-size: 18px; margin: 0 0 8px 0;">🏠 Premium Storage</h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Climate-controlled storage with insurance coverage and cleaning</p>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                  <h4 style="color: #d97706; font-size: 18px; margin: 0 0 8px 0;">🔍 Health Inspections (4x/year)</h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Quarterly digital tread measurements and pressure optimization</p>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 12px; border-left: 4px solid #dc2626;">
                  <h4 style="color: #dc2626; font-size: 18px; margin: 0 0 8px 0;">🔧 Additional Services</h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Wheel alignment, bolt retightening, and comprehensive vehicle inspection</p>
                </div>
              </div>
            </div>
            
            <div style="background: #ecfdf5; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h4 style="color: #065f46; font-size: 20px; margin: 0 0 12px 0;">💰 Package Value</h4>
              <div style="margin-bottom: 12px;">
                <span style="font-size: 28px; font-weight: bold; color: #065f46;">€399/year</span>
                <span style="color: #6b7280; text-decoration: line-through; margin-left: 8px; font-size: 18px;">€549</span>
              </div>
              <p style="color: #065f46; margin: 0; font-weight: 500;">Save €150 compared to individual services</p>
            </div>
            
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; text-align: center; font-weight: 500;">
                ⏰ Limited spots available - Secure your annual care package today!
              </p>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'annual-cta',
      type: 'button' as const,
      content: { text: '🎯 Secure My Annual Package', href: '#', target: '_blank' },
      styles: { backgroundColor: '#1f2937', color: '#ffffff', borderRadius: '8px', padding: '18px 36px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none', boxShadow: '0 6px 20px rgba(31, 41, 55, 0.3)' }
    },
    TIRE_FOOTER_TEMPLATE
  ]
};

const TEMPLATES = [
  // TIRE SERVICE INFORMATIONAL TEMPLATES
  {
    id: 'tire-winter-safety',
    name: 'Winter Safety Guide',
    description: 'Essential winter tire safety tips and preparation checklist',
    category: 'tire-info',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'tire-spring-maintenance',
    name: 'Spring Transition Guide',
    description: 'Spring tire change and proper winter tire storage tips',
    category: 'tire-info',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'tire-midseason-check',
    name: 'Mid-Season Health Check',
    description: 'Professional tire inspection and maintenance reminders',
    category: 'tire-info',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'tire-yearround-care',
    name: 'Year-Round Care Guide',
    description: 'Complete tire maintenance and storage best practices',
    category: 'tire-info',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  },
  
  // TIRE SERVICE PROMOTIONAL TEMPLATES
  {
    id: 'tire-early-bird-winter',
    name: 'Early Bird Winter Special',
    description: 'Pre-November booking discount for winter tire changes',
    category: 'tire-promo',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'tire-spring-bundle',
    name: 'Spring Service Bundle',
    description: 'Complete spring packages with tire change and car wash',
    category: 'tire-promo',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'tire-loyalty-club',
    name: 'VIP Tire Club Membership',
    description: 'Exclusive membership benefits with storage and discounts',
    category: 'tire-promo',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'tire-annual-package',
    name: 'Annual Care Package',
    description: 'Complete yearly tire service with seasonal changes',
    category: 'tire-promo',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Star },
  { id: 'tire-info', name: 'Tire Information', icon: FileText },
  { id: 'tire-promo', name: 'Tire Promotions', icon: Megaphone }
];

export const TemplateLibrary: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { clearNewsletter, addBlock, updateBlock } = useNewsletterStore();
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const filteredTemplates = selectedCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(template => template.category === selectedCategory);

  const handleUseTemplate = (templateId: string) => {
    const templateBlocks = TEMPLATE_BLOCKS[templateId as keyof typeof TEMPLATE_BLOCKS];
    
    if (templateBlocks) {
      // Clear existing blocks and load template
      clearNewsletter();
      
      // Load template blocks into the store
      useNewsletterStore.setState(state => ({
        ...state,
        blocks: templateBlocks,
        selectedBlockId: null
      }));
      
      toast({
        title: t('templateLoaded'),
        description: t('templateLoadedDescription'),
      });
    }
  };

  const handleCreateTemplate = () => {
    toast({
      title: t('createTemplate'),
      description: t('createTemplateDescription'),
    });
    // TODO: Save current newsletter as template
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{t('templates')}</h3>
          <Button variant="outline" size="sm" onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('create')}
          </Button>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedCategory(category.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {category.name}
              </Button>
            );
          })}
        </div>

        {/* Templates */}
        <div className="space-y-3">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="overflow-hidden">
                <div className="aspect-video bg-muted/20 flex items-center justify-center">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    {t('useTemplate')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('noTemplatesFound')}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};