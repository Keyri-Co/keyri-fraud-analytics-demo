import { useState, useContext, useEffect } from 'react';
import Router from 'next/router';
import * as Sentry from '@sentry/nextjs';
import { UserContext } from '@/pages/_app';
import { XRAY } from '@keyri/xray';
import { generateKeyPair, clearIdb } from '@/lib/session-lock';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [jwtInput, setJwtInput] = useState('');
  const { isLoggedIn, setIsLoggedIn } = useContext(UserContext);

  useEffect(() => {
    async function clearEverything() {
      setLoading(false);
      localStorage.clear();
      await clearIdb();
    }

    const token = localStorage.getItem('token');
    if (token) {
      Router.push('/dashboard');
    } else {
      clearEverything();
      setIsLoggedIn(false);
    }
  }, []);

  const toggleAuthState = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  function saveRisk(event) {
    let location = event.location;
    location = JSON.stringify(location);
    localStorage.setItem('signals', event.signals);
    localStorage.setItem('riskParams', event.riskParams);
    localStorage.setItem('geoLocation', location);
    localStorage.setItem('deviceId', event.fingerprintId);
    localStorage.setItem('riskDetermination', event.riskDetermination);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);

    const xray = new XRAY();
    const rpEncryptionPubKey = process.env.NEXT_PUBLIC_RP_ENCRYPTION_PUBLIC_KEY;
    let encryptedSignupEventString;
    try {
      const encryptedSignupEvent = await xray.scan(
        'signup',
        username,
        rpEncryptionPubKey,
        10000,
        'https://r50xv68e3m.execute-api.eu-central-1.amazonaws.com/stage/v1/client'
      );
      encryptedSignupEventString = JSON.stringify(encryptedSignupEvent);
    } catch (error) {
      console.error('Error scanning for signup event:', error);
      Sentry.captureException(error);
      setAuthError('Error scanning for signup event');
      setLoading(false);
      return;
    }

    const publicKey = await generateKeyPair();
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        publicKey,
        encryptedSignupEventString,
      }),
    });

    const response = await res.json();
    const riskResponse = JSON.parse(response.riskResponse);
    saveRisk(riskResponse);

    setLoading(false);

    let destination;

    if (res.status === 200) {
      //Allow case
      toggleAuthState();
      setAuthError('');
      const token = response.token;
      localStorage.setItem('token', token);
      destination = '/dashboard';
    } else if (res.status === 403) {
      //Deny case
      setAuthError('');
      destination = '/denied';
    } else if (res.status === 300) {
      //Warn case
      setAuthError('');
      destination = '/warning';
    } else {
      //Error case
      setAuthError(response.error);
      setLoading(false);
    }

    if (destination) {
      Router.push(destination);
    }
  }
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const xray = new XRAY();

    const rpEncryptionPubKey = process.env.NEXT_PUBLIC_RP_ENCRYPTION_PUBLIC_KEY;
    const encryptedLoginEvent = await xray.scan(
      'login',
      username,
      rpEncryptionPubKey,
      10000,
      'https://r50xv68e3m.execute-api.eu-central-1.amazonaws.com/stage/v1/client'
    );
    const encryptedLoginEventString = JSON.stringify(encryptedLoginEvent);

    const publicKey = await generateKeyPair();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        publicKey,
        encryptedLoginEventString,
      }),
    });
    const response = await res.json();
    const riskResponse = JSON.parse(response.riskResponse);
    saveRisk(riskResponse);

    setLoading(false);

    let destination;

    if (res.status === 200) {
      //Allow case
      toggleAuthState();
      setAuthError('');
      const token = response.token;
      localStorage.setItem('token', token);
      destination = '/dashboard';
    } else if (res.status === 403) {
      //Deny case
      setAuthError('');
      destination = '/denied';
    } else if (res.status === 300) {
      //Warn case
      setAuthError('');
      destination = '/warning';
    } else {
      //Error case
      setAuthError(response.error);
    }

    if (destination) {
      Router.push(destination);
    }
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  const handleJwtAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    const xray = new XRAY();
    const rpEncryptionPubKey = process.env.NEXT_PUBLIC_RP_ENCRYPTION_PUBLIC_KEY;
    const encryptedRiskEvent = await xray.scan(
      'login',
      'jwt',
      rpEncryptionPubKey,
      10000,
      'https://r50xv68e3m.execute-api.eu-central-1.amazonaws.com/stage/v1/client'
    );
    const encryptedRiskEventString = JSON.stringify(encryptedRiskEvent);

    const res = await fetch('/api/decrypt-risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encryptedRiskEventString }),
    });
    const response = await res.json();
    const riskResponse = JSON.parse(response.riskResponse);
    saveRisk(riskResponse);

    localStorage.setItem('token', jwtInput);
    setLoading(false);
    Router.push('/dashboard');
  };

  return (
    <div className='w-full'>
      <div className='flex flex-col mb-4'>
        <h1 className='w-full max-w-sm mx-auto text-2xl font-bold'>{isLogin ? 'Log in' : 'Register'}</h1>
      </div>
      <form className='w-full max-w-sm mx-auto' onSubmit={isLogin ? handleLogin : handleSignup}>
        <div className='flex flex-col mb-4'>
          <input
            className='py-2 px-3 border rounded placeholder-gray-500 focus:outline-none text-gray-800'
            type='text'
            placeholder='Username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className='flex flex-col mb-4'>
          <input
            className='py-2 px-3 border rounded placeholder-gray-500 focus:outline-none text-gray-800'
            type='password'
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className='flex flex-col mb-4'>
          <button
            className='bg-[#934D91] hover:bg-[#A0549D] text-white font-bold py-2 px-4 rounded focus:outline-none flex items-center justify-center'
            type='submit'
            disabled={loading}
          >
            {loading ? (
              <div className='animate-spin w-4 h-4 border-t-2 border-white rounded-full' />
            ) : isLogin ? (
              'Log in'
            ) : (
              'Register'
            )}
          </button>
        </div>
      </form>
      <div className='flex flex-col mb-4'>
        {authError && <p className='text-red-500 w-full max-w-sm mx-auto'>{authError}</p>}
        <p className='w-full max-w-sm mx-auto hover:text-[#A0549D] hover:cursor-pointer' onClick={toggleAuthMode}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </p>
      </div>

      <div className='flex flex-col mb-4 w-full max-w-sm mx-auto'>
        <h3 className='text-lg font-semibold mb-4 border-t border-gray-600 py-4'>
          Or authenticate with JWT from other session
        </h3>
        <input
          className='py-2 px-3 border rounded placeholder-gray-500 focus:outline-none text-gray-800 mb-4'
          type='text'
          placeholder='Paste your JWT here'
          value={jwtInput}
          onChange={(e) => setJwtInput(e.target.value)}
        />
        <button
          className='bg-indigo-800 border border-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none flex items-center justify-center'
          onClick={handleJwtAuth}
          disabled={loading || !jwtInput}
        >
          {loading ? (
            <div className='animate-spin w-4 h-4 border-t-2 border-white rounded-full' />
          ) : (
            'Authenticate with JWT'
          )}
        </button>
      </div>
    </div>
  );
};

export default AuthForm;
