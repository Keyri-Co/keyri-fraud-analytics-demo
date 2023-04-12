import { useState, useContext, useEffect } from 'react';
import Router from 'next/router';
import { UserContext } from '@/pages/_app';
import { Device } from 'keyri-fingerprint';
import { generateKeyPair, clearIdb } from '@/lib/session-lock';
import { checkWarnOrDeny } from '@/lib/riskAnalysis';

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
      localStorage.removeItem('token');
      localStorage.removeItem('eventDetails');
      localStorage.removeItem('riskParams');
      localStorage.removeItem('geoLocation');
      localStorage.removeItem('signals');
      localStorage.removeItem('deviceId');
      await clearIdb();
    }
    clearEverything();

    setIsLoggedIn(false);
  }, []);

  const toggleAuthState = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  function saveRisk(event) {
    const riskParams = event.riskParams;
    const geoLocation = JSON.stringify(event.location);
    const riskSignals = event.signals;
    const deviceId = event.fingerprintId;
    localStorage.setItem('signals', riskSignals);
    localStorage.setItem('riskParams', riskParams);
    localStorage.setItem('geoLocation', geoLocation);
    localStorage.setItem('deviceId', deviceId);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    let device = new Device({ apiKey: process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY, environment: 'development' });
    await device.load();

    const publicKey = await generateKeyPair();
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, publicKey }),
    });

    if (res.status === 200) {
      toggleAuthState();
      setAuthError('');

      const signupEvent = await device.generateEvent({ eventType: 'signup', eventResult: 'success', userId: username });
      saveRisk(signupEvent);
      const riskDetermination = checkWarnOrDeny(JSON.parse(signupEvent.riskParams));
      console.log('riskDetermination', riskDetermination);
      if (riskDetermination === 'Deny') {
        setLoading(false);
        Router.push('/denied');
      } else if (riskDetermination === 'Warn') {
        setLoading(false);
        Router.push('/warning');
      } else {
        const { token } = await res.json();
        localStorage.setItem('token', token);

        setLoading(false);
        Router.push('/dashboard');
      }
    } else {
      setLoading(false);
      setAuthError('Username already exists');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    let device = new Device({ apiKey: process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY, environment: 'development' });
    await device.load();

    const publicKey = await generateKeyPair();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, publicKey }),
    });

    if (res.status === 200) {
      toggleAuthState();
      setAuthError('');

      const loginEvent = await device.generateEvent({ eventType: 'login', eventResult: 'success', userId: username });
      saveRisk(loginEvent);
      const riskDetermination = checkWarnOrDeny(JSON.parse(loginEvent.riskParams));
      if (riskDetermination === 'Deny') {
        console.log('DENY CASE', riskDetermination);
        setLoading(false);
        Router.push('/denied');
        console.log('DENY CASE 2', riskDetermination);
      } else if (riskDetermination === 'Warn') {
        console.log('WARN CASE', riskDetermination);
        console.log('riskDetermination', riskDetermination);
        setLoading(false);
        Router.push('/warning');
        console.log('WARN CASE 2', riskDetermination);
      } else {
        const { token } = await res.json();
        localStorage.setItem('token', token);

        setLoading(false);
        console.log('ALLOW CASE', riskDetermination);
        Router.push('/dashboard');
      }
    } else {
      setLoading(false);
      setAuthError('Invalid username or password');
      await device.generateEvent({ eventType: 'login', eventResult: 'fail', userId: username });
    }
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  const handleJwtAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let device = new Device({ apiKey: process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY, environment: 'development' });
    await device.load();
    const loginEvent = await device.generateEvent({ eventType: 'login', eventResult: 'success', userId: username });
    saveRisk(loginEvent);

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
