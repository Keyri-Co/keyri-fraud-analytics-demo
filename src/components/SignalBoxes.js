import React from 'react';
import { useState, useEffect } from 'react';

const SignalBoxes = ({ riskDeterminationIn, geoLocation, signals, deviceId }) => {
  const [riskDetermination, setRiskDetermination] = useState('');
  const [riskDeterminationColor, setRiskDeterminationColor] = useState('');

  function truncateString(str) {
    if (str.length <= 8) {
      return str;
    }

    const firstFourChars = str.slice(0, 5);
    const lastFourChars = str.slice(-4);
    return `${firstFourChars}...${lastFourChars}`;
  }

  useEffect(() => {
    const riskDetermination = riskDeterminationIn ? riskDeterminationIn : '';
    setRiskDetermination(riskDetermination);
    if (riskDetermination === 'deny') {
      setRiskDeterminationColor('bg-[#C42021]');
    } else if (riskDetermination === 'warn') {
      setRiskDeterminationColor('bg-[#F7B500]');
    } else {
      setRiskDeterminationColor('bg-[#1E9E2F]');
    }
  }, [riskDeterminationIn]);

  return (
    <>
      <p className='text-white mb-2 border-b border-gray-600'>Summary risk determination</p>
      <div className='flex flex-row space-x-4'>
        <div className={`text-white ${riskDeterminationColor} p-2 transition duration-300 rounded-md mb-4`}>
          {riskDetermination.charAt(0).toUpperCase() + riskDetermination.slice(1)}
        </div>
      </div>
      <p className='text-white mb-2 border-b border-gray-600'>Fraud risk signals</p>
      <div className='flex flex-row flex-wrap space-x-4 mb-4'>
        {signals.map((signal, index) => (
          <div key={index} className={`${riskDeterminationColor} text-white p-2 rounded-md`}>
            {signal}
          </div>
        ))}
      </div>
      <p className='text-white mb-2 border-b border-gray-600'>Device info</p>
      <p className='text-white mb-2'>Device ID: {truncateString(deviceId)}</p>
      <p className='text-white mb-2'>
        Location: {geoLocation.city},
        {geoLocation.regionType == 'state'
          ? ` ${geoLocation.regionCode}, ${geoLocation.country}`
          : ` ${geoLocation.country}`}
      </p>
    </>
  );
};

export default SignalBoxes;
