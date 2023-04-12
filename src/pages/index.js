import Head from 'next/head';
import AuthForm from '../components/AuthForm';

export default function Auth() {
  return (
    <>
      <Head>
        <title>Keyri Fraud Prevention Demo</title>
        <link rel='icon' href='/favicon.ico' />
        <meta
          name='description'
          content='An example web app demonstrating Keyri fingerprinting and fraud analytics capabilities with the `keyri-fingerprint` library'
        />
      </Head>
      <AuthForm />
    </>
  );
}
