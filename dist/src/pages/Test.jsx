import React, { useEffect, useState } from 'react'
import { useGetBirds } from '../hooks/useBirds'
import { birdService } from '../api/services/birdService';
import useAuthStore from '../store/authStore';

function Test() {
    const {data, isLoading, error} = useGetBirds();
    console.log('DATA ',data);
    console.log('LOADING ',isLoading);
    console.log('ERROR ',error);
  return (
    <div>
    <h1>Test</h1> 
    </div>
  )
}

export default Test