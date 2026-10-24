import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';

export const metadata = {
  title: 'Privacidad y datos personales · Wisdom Academy',
};

export default function PrivacyPage() {
  return (
    <>
      <PublicHeader minimal showLogin={false} />
      <main className="wa-checkout-page">
        <section className="wa-checkout-main" style={{ maxWidth: 860 }}>
          <header className="wa-checkout-head">
            <span className="wa-eyebrow">Versión 2026-10-24</span>
            <h1>Privacidad y datos personales</h1>
            <p>
              Información sobre el tratamiento de datos de compradores, estudiantes, familias y
              usuarios de Wisdom Academy, conforme a la Ley Orgánica de Protección de Datos
              Personales del Ecuador.
            </p>
          </header>
          <article className="wa-checkout-card" style={{ lineHeight: 1.7, fontSize: '0.86rem' }}>
            <h2>1. Responsable del tratamiento</h2>
            <p>
              Wisdom Academy es responsable de los datos necesarios para prestar el servicio
              educativo, gestionar compras y mantener los registros académicos. El canal de
              contacto institucional se publica en la plataforma y en los mensajes de la compra.
            </p>
            <h2>2. Datos que tratamos</h2>
            <ul>
              <li>Identificación y contacto: nombres, apellidos, correo, teléfono, país.</li>
              <li>Datos de facturación e identificación cuando sean necesarios.</li>
              <li>Datos académicos del estudiante y del representante legal, si corresponde.</li>
              <li>Información de la orden y del pago, sin datos de tarjeta.</li>
              <li>Registros de acceso, seguridad y auditoría.</li>
            </ul>
            <h2>3. Finalidades y base jurídica</h2>
            <p>
              Tratamos los datos para ejecutar la compra y la matrícula, prestar el servicio
              educativo, atender obligaciones legales, proteger la plataforma y, solo con
              consentimiento separado, enviar comunicaciones comerciales. Los datos necesarios para
              el servicio no dependen del consentimiento comercial.
            </p>
            <h2>4. Menores de edad</h2>
            <p>
              Cuando el estudiante es menor, el tratamiento se realiza con la autorización del
              representante legal y se limita a la gestión académica y administrativa. El menor no
              necesita crear una cuenta independiente.
            </p>
            <h2>5. Proveedores</h2>
            <p>
              PayPal procesa los pagos y el proveedor de correo transaccional envía mensajes de
              acceso. Estos proveedores reciben únicamente los datos necesarios para su función y
              aplican sus propias medidas de seguridad. No vendemos datos personales.
            </p>
            <h2>6. Conservación y seguridad</h2>
            <p>
              Conservamos los datos durante la relación educativa y los plazos legales aplicables.
              Aplicamos control de acceso, cifrado de credenciales, tokens de un solo uso y
              registros de auditoría. Las contraseñas nunca se guardan en texto plano ni se envían
              por correo.
            </p>
            <h2>7. Derechos</h2>
            <p>
              Puedes solicitar acceso, rectificación, actualización, eliminación, oposición,
              limitación o portabilidad de tus datos, así como retirar el consentimiento
              comercial, mediante el canal de contacto institucional. Responderemos conforme a los
              plazos legales. También puedes presentar una reclamación ante la autoridad de
              protección de datos competente.
            </p>
            <h2>8. Enlaces</h2>
            <p>
              Consulta los <Link href="/terminos">términos y condiciones</Link> y la información
              mostrada antes de pagar.
            </p>
          </article>
        </section>
      </main>
    </>
  );
}
