import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { supabase } from '../lib/supabaseClient';

export const UsuarioPortal = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  if (!user) return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card style={{ textAlign: 'center' }}>
        <CardHeader>
          <CardTitle>Mi Pase de Abordaje</CardTitle>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginTop: '4px' }}>
            Muestra este código al chofer al subir.
          </p>
        </CardHeader>
        
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: 'var(--rounded-md)', display: 'inline-block', margin: '24px 0' }}>
          <QRCode value={user.id} size={200} level="H" />
        </div>

        <div>
          <h3 style={{ margin: 0, fontWeight: 600 }}>{user.email}</h3>
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>Rol: {user.user_metadata?.role || 'usuario'}</p>
        </div>
      </Card>
    </div>
  );
};
