import { useState, useEffect, useContext } from 'react';
import Router from 'next/router';
import Head from 'next/head';
import { UserContext } from '@/pages/_app';
import { clearIdb } from '@/lib/session-lock';
import SignalBoxes from '@/components/SignalBoxes';

export default function Warning() {
  const { isLoggedIn, setIsLoggedIn } = useContext(UserContext);
  const [signals, setSignals] = useState([]);
  const [riskParams, setRiskParams] = useState('');
  const [geoLocation, setGeoLocation] = useState({});
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    const storedRiskParams = localStorage.getItem('riskParams');
    if (storedRiskParams) {
      setRiskParams(JSON.parse(storedRiskParams));
    }
    const storedGeoLocation = localStorage.getItem('geoLocation');
    if (storedGeoLocation) {
      setGeoLocation(JSON.parse(storedGeoLocation));
    }
    const storedSignals = localStorage.getItem('signals');
    if (storedSignals) {
      setSignals(storedSignals.split(','));
    }
    const deviceId = localStorage.getItem('deviceId');
    if (deviceId) {
      setDeviceId(deviceId);
    }
  }, [setIsLoggedIn]);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('eventDetails');
    localStorage.removeItem('riskParams');
    localStorage.removeItem('geoLocation');
    localStorage.removeItem('signals');
    localStorage.removeItem('deviceId');
    await clearIdb();

    setIsLoggedIn(false);
    Router.push('/');
  };

  return (
    <>
      <Head>
        <title>Keyri Fraud Prevention - Denied</title>
        <link rel='icon' href='/favicon.ico' />
        <meta
          name='description'
          content='Your authentication event has been flagged as suspicious and subsequently denied due to the fraud risk handling rules set in the Keyri Dashboard.'
        />
      </Head>
      <div className='container'>
        <h1 className='text-2xl font-bold mb-4'>Your authentication was denied</h1>
        <div className='container mx-auto mb-4'>
          Your authentication event has been flagged as suspicious and subsequently denied due to the fraud risk
          handling rules set in the{' '}
          <a
            href='https://app.keyri.com'
            target='_blank'
            rel='noopener noreferrer'
            className='text-[#A0549D] hover:cursor-pointer'
          >
            Keyri Dashboard
          </a>
          . Please inspect the risk signals below for details.
        </div>

        <button
          className='bg-[#934D91] hover:bg-[#A0549D] text-white font-medium rounded-lg text-m px-4 py-2 text-center'
          onClick={handleLogout}
        >
          Go back
        </button>

        <div className='container mx-auto max-w-screen-xl mt-10'>
          <p className='text-m font-semibold mb-2 border-b-2 border-gray-600'>Fraud Risk Details</p>

          <SignalBoxes riskParams={riskParams} geoLocation={geoLocation} signals={signals} deviceId={deviceId} />
        </div>
      </div>
    </>
  );
}
