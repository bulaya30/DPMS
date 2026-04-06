import axios from "axios";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { authService } from "./services/authService";
import useAuthStore from "../store/authStore";

export const login = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password required");
  }
  try {
    // 🔐 Firebase client login
    const cred = await signInWithEmailAndPassword(auth, email, password);
  
    // 🔑 Firebase ID token
    const idToken = await cred.user.getIdToken();
  
    // 🌐 Call backend LOGIN (explicit header)
    const res = await authService.login(idToken);
    useAuthStore.getState().login(res.user, res.token);
    return res;
    
  } catch (error) {
    console.log(error);
    throw new Error("Wrong email address or password");
    
  }
};

