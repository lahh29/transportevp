import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoMockup } from './LogoMockup';
import { CheckCircle2 } from 'lucide-react';

export const LoginTransition = ({ isVisible, userName = '' }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--color-canvas)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 20, stiffness: 100 }}
            style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               gap: '32px'
            }}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <LogoMockup />
            </motion.div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', damping: 15 }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-semantic-success)' }}
              >
                <CheckCircle2 size={28} strokeWidth={2.5} />
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                  Acceso Autorizado
                </h2>
              </motion.div>
              
              {userName && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  style={{ margin: 0, fontSize: '16px', color: 'var(--color-muted)' }}
                >
                  Bienvenido, {userName.split(' ')[0]}
                </motion.p>
              )}
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                style={{ marginTop: '16px' }}
              >
                <div style={{ width: '40px', height: '4px', background: 'var(--color-hairline-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: '50%', height: '100%', background: 'var(--color-accent)', borderRadius: '2px' }}
                  />
                </div>
              </motion.div>
            </div>
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
