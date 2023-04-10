import { useState, useContext } from 'react';
import Router from 'next/router';
import { UserContext } from '@/pages/_app';
import { Device } from 'keyri-fingerprint';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { isLoggedIn, setIsLoggedIn } = useContext(UserContext);

  const toggleAuthState = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    let device = new Device({ apiKey: process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY, environment: 'development' });
    await device.load();

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.status === 200) {
      toggleAuthState();
      const { token } = await res.json();
      localStorage.setItem('token', token);
      const signupEvent = await device.generateEvent({ eventType: 'signup', eventResult: 'success', userId: username });
      const riskSignals = signupEvent.signals;
      localStorage.setItem('eventDetails', riskSignals);
      setLoading(false);
      Router.push('/dashboard');
    } else {
      setLoading(false);
      alert('Failed to sign up');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    let device = new Device({ apiKey: process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY, environment: 'development' });
    await device.load();

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.status === 200) {
      toggleAuthState();
      setLoginError('');
      const { token } = await res.json();
      localStorage.setItem('token', token);
      const loginEvent = await device.generateEvent({ eventType: 'login', eventResult: 'success', userId: username });
      console.log(loginEvent);
      const riskParams = loginEvent.riskParams;
      const geoLocation = JSON.stringify(loginEvent.location);
      const riskSignals = loginEvent.signals;
      const deviceId = loginEvent.fingerprintId;
      localStorage.setItem('signals', riskSignals);
      localStorage.setItem('riskParams', riskParams);
      localStorage.setItem('geoLocation', geoLocation);
      localStorage.setItem('deviceId', deviceId);
      setLoading(false);
      Router.push('/dashboard');
    } else {
      setLoading(false);
      setLoginError('Invalid username or password');
      await device.generateEvent({ eventType: 'login', eventResult: 'fail', userId: username });
    }
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
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
        {loginError && <p className='text-red-500 w-full max-w-sm mx-auto'>{loginError}</p>}
        <p className='w-full max-w-sm mx-auto hover:text-[#A0549D] hover:cursor-pointer' onClick={toggleAuthMode}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
