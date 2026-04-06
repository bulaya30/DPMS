import React, { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import UpdateProfle from "./updateProfile";
import useAuthStore from "../../store/authStore";



/* ================= MAIN CONTAINER ================= */
function Profile() {
  const user = useAuthStore((state) => state.user);
  
  /* ================= RENDER ================= */
  return (
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
          />
        </div>
      </motion.div>
    </div>
  )


}

export default Profile;