import React, { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Building2,
  Edit,
  Save,
  X,
  User2,
  Contact2,
  Contact,
} from "lucide-react";
import UpdateProfle from "./updateProfile";

const userInfo = JSON.parse(localStorage.getItem("user"));

/* ================= MAIN CONTAINER ================= */
function Profile() {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState()

  useEffect(()=>{
    (async () => {
      setUser(userInfo)
    })()
  }, [userInfo])


     /* ================= RENDER ================= */
  return (
    <>
      {loading && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <span>Loading data...</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {!loading && !error && ( 
        <div className={`dashboard-page `}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile-container"
          >
            <div className="profile-view">
              <div className="logo-div">
                <h2>
                  {user?.lastName.charAt(0)}
                </h2>
              </div>
              <div className="profile-info">
                <p> {user?.firstName} {user?.lastName}</p>
                <p> {user?.email}</p>
                <p> {user?.contact}</p>
                <p> {user?.role}</p>
              </div>
            </div>
            <div className="profile-edit">
                <UpdateProfle
                  profile={user}
                  onSuccess={async () => { user }}
                />
            </div>

          </motion.div>

        </div>

      )}
      </>
  )


}

export default Profile;