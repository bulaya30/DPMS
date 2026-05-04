import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { checkName } from "../../validations/validate";
import { useProcessBranch } from "../../hooks/useBranches";
import { FaSave } from "react-icons/fa";
import FormField from "../../components/FormField";

/* ================= NEW LOCATION DATA ================= */
const LOCATION_DATA = [
  { city: "Central Division", district: "Kampala" },
  { city: "Nakawa Division", district: "Kampala" },
  { city: "Makindye Division", district: "Kampala" },
  { city: "Rubaga Division", district: "Kampala" },
  { city: "Kawempe Division", district: "Kampala" },

  { city: "Nansana", district: "Wakiso" },
  { city: "Kira", district: "Wakiso" },
  { city: "Entebbe", district: "Wakiso" },
  { city: "Kajansi", district: "Wakiso" },

  { city: "Mukono Town", district: "Mukono" },
  { city: "Seeta", district: "Mukono" },
  { city: "Nama", district: "Mukono" },

  { city: "Jinja City", district: "Jinja" },
  { city: "Bugembe", district: "Jinja" }
];

function AddBranch() {
  const { mutate, isPending: isSaving } = useProcessBranch();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onBlur",
  });

  /* ===== WATCH ===== */
  const selectedDistrict = watch("district");

  /* ================= DERIVED DATA ================= */

  // Unique districts
  const districts = useMemo(() => {
    return [...new Set(LOCATION_DATA.map(loc => loc.district))];
  }, []);

  // Cities filtered by selected district
  const cities = useMemo(() => {
    if (!selectedDistrict) return [];
    return LOCATION_DATA
      .filter(loc => loc.district === selectedDistrict)
      .map(loc => loc.city);
  }, [selectedDistrict]);

  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ================= SHAKE RESET ================= */
  useEffect(() => {
    if (!shake) return;
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
  }, [shake]);

  /* ================= SUBMIT ================= */
  const handleCreate = (data) => {
    if (isSaving) return;

    const payload = {
      collection: "branches",
      action: "add",
      data: {
        name: data.name.trim(),
        district: data.district,
        city: data.city,
      },
    };

    mutate(payload, {
      onSuccess: () => {
        setSuccess("Branch added successfully!");
        reset();
      },
      onError: (err) => {
        setServerError(err.message || "Failed to add branch");
        setShake(true);
      },
      onSettled: () => {
        setTimeout(() => {
          setSuccess("");
          setServerError("");
          setShake(false);
        }, 4000);
      },
    });
  };

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="server-error">{serverError}</p>}

      <form
        onSubmit={handleSubmit(
          handleCreate,
          () => setShake(true)
        )}
        autoComplete="off"
      >
        <h2>New Branch</h2>

        {/* ===== DISTRICT & CITY ===== */}
        <div className="norrechel-grouped-inputs">

          {/* DISTRICT FIRST */}
          <FormField
            name="district"
            label="District"
            register={register}
            rules={{ required: "District is required" }}
            options={districts}
            error={errors.district}
            triggerShake={shake}
          />

          {/* CITY DEPENDS ON DISTRICT */}
          <FormField
            name="city"
            label="City"
            register={register}
            rules={{ required: "City is required" }}
            options={cities}
            error={errors.city}
            triggerShake={shake}
            disabled={!selectedDistrict}
          />

        </div>

        {/* ===== NAME ===== */}
        <div className="norrechel-grouped-inputs">
          <FormField
            name="name"
            label="Name"
            register={register}
            rules={{
              required: "Branch name is required",
              validate: (v) =>
                checkName(v) || "Invalid branch name",
            }}
            error={errors.name}
            placeholder="Enter branch name"
            triggerShake={shake}
          />
        </div>

        {/* ===== SUBMIT ===== */}
        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default AddBranch;