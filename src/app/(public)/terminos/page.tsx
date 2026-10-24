import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';

export const metadata = {
  title: 'Términos y condiciones · Wisdom Academy',
};

export default function TermsPage() {
  return (
    <>
      <PublicHeader minimal showLogin={false} />
      <main className="wa-checkout-page">
        <section className="wa-checkout-main" style={{ maxWidth: 860 }}>
          <header className="wa-checkout-head">
            <span className="wa-eyebrow">Versión 2026-10-24</span>
            <h1>Términos y condiciones</h1>
            <p>
              Estos términos regulan el uso de Wisdom Academy, la compra de cursos, talleres y
              programas, y la creación de la cuenta de acceso.
            </p>
          </header>
          <article className="wa-checkout-card" style={{ lineHeight: 1.7, fontSize: '0.86rem' }}>
            <h2>1. Servicio educativo</h2>
            <p>
              Wisdom Academy ofrece contenidos y acompañamiento educativo en modalidad híbrida.
              La compra de un producto concede acceso únicamente a los recursos incluidos en la
              orden confirmada, durante el período indicado en el catálogo.
            </p>
            <h2>2. Cuenta y credenciales</h2>
            <p>
              Para comprar no es necesario crear una cuenta. Después de confirmar el pago, el
              comprador debe completar el registro para activar su matrícula. Las credenciales son
              personales e intransferibles; el representante legal administra la cuenta de los
              estudiantes menores de edad.
            </p>
            <h2>3. Pagos</h2>
            <p>
              Los pagos se procesan mediante PayPal. Wisdom Academy no recibe ni almacena números
              de tarjeta. El acceso se activa cuando el servidor verifica la captura del pago; una
              redirección del navegador no sustituye esa verificación.
            </p>
            <h2>4. Uso del contenido</h2>
            <p>
              El material es para uso personal y educativo. No está permitido redistribuirlo,
              venderlo, publicarlo ni compartir credenciales. El incumplimiento puede suspender el
              acceso conforme a las normas institucionales y la ley aplicable.
            </p>
            <h2>5. Cancelaciones y reembolsos</h2>
            <p>
              Las solicitudes de cancelación o reembolso se atienden según la normativa aplicable
              y las condiciones informadas antes de la compra. La reversión de un pago revoca los
              derechos originados por esa compra, sin afectar otros accesos legítimos.
            </p>
            <h2>6. Menores de edad</h2>
            <p>
              Cuando el producto se dirige a menores, el comprador declara ser el padre, la madre
              o el representante legal y autoriza la matrícula y el tratamiento de datos necesario
              para la gestión académica.
            </p>
            <h2>7. Contacto</h2>
            <p>
              Para consultas sobre una compra, usa el correo registrado en la orden o el canal de
              contacto institucional publicado en la plataforma. Conserva la referencia de la
              orden para agilizar la atención.
            </p>
            <p>
              Consulta también la{' '}
              <Link href="/privacidad">política de tratamiento de datos personales</Link>.
            </p>
          </article>
        </section>
      </main>
    </>
  );
}
