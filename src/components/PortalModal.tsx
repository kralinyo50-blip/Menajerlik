import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * 🐛 Panel içinden açılan tam ekran pencereleri document.body'ye taşır.
 *
 * Ana panel `backdrop-blur` kullandığı için tarayıcı onu `position: fixed`
 * çocukları için "kapsayıcı blok" yapar: modal viewport'a değil panelin
 * kaydırma içeriğine sabitleniyordu. Bu yüzden Antrenman'da listedeki en alt
 * oyuncuya basınca pencere ekranın tepesine düşüyordu (kullanıcının bildirdiği
 * "en altta basıyorum, en üstte çıkıyor" hatası). Portal ile modaller her
 * zaman gerçek ekranın ortasında açılır.
 */
export const PortalModal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [host] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? document.createElement('div') : null
  );
  useEffect(() => {
    if (!host) return;
    document.body.appendChild(host);
    return () => {
      if (host.parentNode) host.parentNode.removeChild(host);
    };
  }, [host]);
  if (!host) return null;
  return createPortal(children, host);
};
