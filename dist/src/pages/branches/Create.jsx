import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { checkName } from "../../validations/validate";
import { useProcessBranch } from "../../hooks/useBranches";
import { FaSave } from "react-icons/fa";
import FormField from "../../components/FormField";

/* ================= LOCATION DATA ================= */
const LOCATION_DATA = {
  Kampala: ["Central", "Nakawa", "Makindye", "Rubaga", "Kawempe"],
  Wakiso: ["Nansana", "Kira", "Entebbe", "Kajansi"],
  Mukono: ["Mukono Town", "Seeta", "Nama"],
  Jinja: ["Jinja City", "Bugembe"]
};

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

  const district = watch("district");

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
          <FormField
            name="district"
            label="District"
            register={register}
            rules={{ required: "District is required" }}
            error={errors.district}
            options={Object.keys(LOCATION_DATA)}
            triggerShake={shake}
          />

          <FormField
            name="city"
            label="City"
            register={register}
            rules={{ required: "City is required" }}
            error={errors.city}
            options={district ? LOCATION_DATA[district] : []}
            disabled={!district}
            triggerShake={shake}
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