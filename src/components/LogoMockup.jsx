import React from 'react';

export const LogoMockup = () => (
  <div style={{
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 4px 16px rgba(26, 35, 126, 0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: '16px',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'rgba(0, 180, 219, 0.08)',
      zIndex: 0
    }} />

    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ zIndex: 1, marginBottom: '2px' }}>
      <rect x="4" y="14" width="28" height="8" rx="2" fill="url(#extrusionGradient)" stroke="#1a237e" strokeWidth="1.2"/>
      <path d="M8 18 L12 15 L16 18 L20 15 L24 18 L28 15" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 14 L16 6 L20 6 L22 14" fill="#1a237e" opacity="0.15"/>
      <path d="M14 14 L16 6 L20 6 L22 14" stroke="#1a237e" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="extrusionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00b4db"/>
          <stop offset="100%" stopColor="#0083b0"/>
        </linearGradient>
      </defs>
    </svg>

    <div style={{
      fontWeight: 800,
      color: '#1a237e',
      fontSize: '10px',
      letterSpacing: '1.2px',
      lineHeight: 1,
      zIndex: 1,
      marginTop: '2px'
    }}>
      PLASTIC
    </div>
  </div>
);
