import { useState, useEffect, useContext } from 'react';
import Router from 'next/router';
import Head from 'next/head';
import { UserContext } from '@/pages/_app';
import { lockToken, clearIdb } from '@/lib/session-lock';
import SignalBoxes from '@/components/SignalBoxes';
import CopyTokenButton from '@/components/CopyTokenButton';

export default function Dashboard() {
  const [message, setMessage] = useState('');
  const { isLoggedIn, setIsLoggedIn } = useContext(UserContext);
  const [signals, setSignals] = useState([]);
  const [riskParams, setRiskParams] = useState('');
  const [geoLocation, setGeoLocation] = useState({});
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('token');
      if (!token) {
        Router.push('/');
      }

      try {
        const lockedToken = await lockToken(token);

        const res = await fetch('/api/protected', {
          headers: { Authorization: `Bearer ${lockedToken}` },
        });

        if (res.status === 200) {
          const data = await res.json();

          setIsLoggedIn(true);
          setMessage(data.message);
        } else {
          setIsLoggedIn(false);
          setMessage(data.message);
        }
      } catch (error) {
        console.error(error);
        setIsLoggedIn(false);
        setMessage(
          `Something went wrong with your authentication. You might be improperly re-using a session token. Please try again.`
        );
      }
    }

    fetchData();

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
        <title>Keyri Fraud Prevention - Allowed</title>
        <link rel='icon' href='/favicon.ico' />
        <meta name='description' content='The post-authentication page for Keyri Fraud Prevention.' />
      </Head>
      <div className='container'>
        <h1 className='text-2xl font-bold mb-4'>{isLoggedIn ? `You're logged in!` : `Try again!`}</h1>
        <div className='container mx-auto mb-4'>
          <p>{message}</p>
        </div>
        {isLoggedIn ? (
          <>
            <CopyTokenButton />
            <button
              className='bg-[#934D91] hover:bg-[#A0549D]  text-white font-medium rounded-lg text-m px-4 py-2 text-center'
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              className='bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg text-m px-4 py-2 text-center'
              onClick={handleLogout}
            >
              Go back
            </button>
          </>
        )}

        <div className='container mx-auto max-w-screen-xl mt-10'>
          <p className='text-m font-semibold mb-2 border-b-2 border-gray-600'>Fraud Risk Details</p>

          <SignalBoxes riskParams={riskParams} geoLocation={geoLocation} signals={signals} deviceId={deviceId} />
        </div>
      </div>
    </>
  );
}
