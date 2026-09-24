"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveProfileDetails,
  uploadCredential,
  deleteCredential,
  submitForReview,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/lfa/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2 } from "lucide-react";
import { isValidAbn } from "@/lib/rules/abn";

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
const CREDENTIAL_TYPES = [
  "TRADE_LICENCE",
  "WHITE_CARD",
  "PUBLIC_LIABILITY",
  "WORKERS_COMP",
  "POLICE_CHECK",
  "WWCC",
  "OTHER",
] as const;

type ExistingProfile = {
  fullName: string;
  phone: string;
  abn: string;
  primaryTrade: string;
  otherTrades: string; // JSON-encoded string[]
  yearsExperience: number;
  bio: string;
  hourlyRate: number; // cents
  homeState: string;
  postcode: string;
  serviceRadiusKm: number;
  profileStatus: string;
};

type ExistingCredential = {
  id: string;
  type: string;
  status: string;
  trade: string | null;
  issuingState: string | null;
  expiryDate: string | null;
  file: { originalName: string; id: string };
};

const STEPS = [
  "Personal details",
  "Trade & experience",
  "Service area & rate",
  "Credentials",
] as const;

export function OnboardingWizard({
  profile,
  credentials,
}: {
  profile: ExistingProfile;
  credentials: ExistingCredential[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const [form, setForm] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    abn: profile.abn,
    primaryTrade: profile.primaryTrade,
    otherTrades: JSON.parse(profile.otherTrades || "[]") as string[],
    yearsExperience: String(profile.yearsExperience || ""),
    bio: profile.bio,
    hourlyRateDollars: profile.hourlyRate ? String(profile.hourlyRate / 100) : "",
    homeState: profile.homeState,
    postcode: profile.postcode,
    serviceRadiusKm: String(profile.serviceRadiusKm || ""),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.fullName.trim()) return "Enter your full name.";
      if (!form.phone.trim()) return "Enter a phone number.";
      if (!isValidAbn(form.abn)) return "Enter a valid 11-digit ABN.";
    }
    if (step === 1) {
      if (!form.primaryTrade) return "Select your primary trade.";
      if (!form.yearsExperience) return "Enter your years of experience.";
      if (form.bio.trim().length < 50)
        return "Bio must be at least 50 characters.";
    }
    if (step === 2) {
      if (!form.homeState) return "Select your home state.";
      if (!/^\d{4}$/.test(form.postcode)) return "Enter a 4-digit postcode.";
      if (!form.serviceRadiusKm) return "Enter a service radius.";
      if (!form.hourlyRateDollars) return "Enter an hourly rate.";
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    if (step === 2) {
      // Leaving step 3 (service area & rate) — persist everything collected
      // across steps 1–3 in one save before moving to credentials.
      const formData = new FormData();
      formData.set("fullName", form.fullName);
      formData.set("phone", form.phone);
      formData.set("abn", form.abn);
      formData.set("primaryTrade", form.primaryTrade);
      form.otherTrades.forEach((t) => formData.append("otherTrades", t));
      formData.set("yearsExperience", form.yearsExperience);
      formData.set("bio", form.bio);
      formData.set("hourlyRateDollars", form.hourlyRateDollars);
      formData.set("homeState", form.homeState);
      formData.set("postcode", form.postcode);
      formData.set("serviceRadiusKm", form.serviceRadiusKm);

      startSaving(async () => {
        const result = await saveProfileDetails(undefined, formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setStep(3);
        router.refresh();
      });
      return;
    }

    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`font-heading flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i === step
                  ? "bg-hivis text-white"
                  : i < step
                    ? "bg-verified text-white"
                    : "bg-card text-muted-foreground ring-1 ring-foreground/15"
              }`}
            >
              {i + 1}
            </div>
            <span className={`hidden text-sm sm:inline ${i === step ? "font-semibold" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="bg-border h-px flex-1" />}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  placeholder="11 digits"
                  value={form.abn}
                  onChange={(e) => update("abn", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="primaryTrade">Primary trade</Label>
                <select
                  id="primaryTrade"
                  value={form.primaryTrade}
                  onChange={(e) => update("primaryTrade", e.target.value)}
                  className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">Select a trade…</option>
                  {TRADES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Other trades (optional)</Label>
                <div className="flex flex-wrap gap-4">
                  {TRADES.filter((t) => t !== form.primaryTrade).map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.otherTrades.includes(t)}
                        onCheckedChange={(checked) =>
                          update(
                            "otherTrades",
                            checked
                              ? [...form.otherTrades, t]
                              : form.otherTrades.filter((x) => x !== t)
                          )
                        }
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min={0}
                  value={form.yearsExperience}
                  onChange={(e) => update("yearsExperience", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">
                  Bio ({form.bio.trim().length}/50 characters minimum)
                </Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="homeState">Home state</Label>
                <select
                  id="homeState"
                  value={form.homeState}
                  onChange={(e) => update("homeState", e.target.value)}
                  className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">Select a state…</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  maxLength={4}
                  value={form.postcode}
                  onChange={(e) => update("postcode", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceRadiusKm">Service radius (km)</Label>
                <Input
                  id="serviceRadiusKm"
                  type="number"
                  min={1}
                  value={form.serviceRadiusKm}
                  onChange={(e) => update("serviceRadiusKm", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRateDollars">Hourly rate (AUD)</Label>
                <Input
                  id="hourlyRateDollars"
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.hourlyRateDollars}
                  onChange={(e) => update("hourlyRateDollars", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <CredentialsStep
              credentials={credentials}
              profileStatus={profile.profileStatus}
            />
          )}
        </CardContent>
      </Card>

      {step < 3 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} disabled={step === 0}>
            Back
          </Button>
          <Button onClick={goNext} disabled={saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-start">
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

function CredentialsStep({
  credentials,
  profileStatus,
}: {
  credentials: ExistingCredential[];
  profileStatus: string;
}) {
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, startUploading] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const [type, setType] = useState<(typeof CREDENTIAL_TYPES)[number]>("WHITE_CARD");

  function handleUpload(formData: FormData) {
    startUploading(async () => {
      const result = await uploadCredential(undefined, formData);
      if (result?.error) {
        setUploadError(result.error);
        return;
      }
      setUploadError(null);
      router.refresh();
    });
  }

  function handleSubmit() {
    startSubmitting(async () => {
      const result = await submitForReview();
      if (result?.error) {
        setSubmitError(result.error);
        return;
      }
      setSubmitError(null);
      router.push("/worker/dashboard");
    });
  }

  return (
    <div className="space-y-6">
      {credentials.length > 0 && (
        <ul className="space-y-2">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{c.type.replace(/_/g, " ")}</span>
                {c.issuingState && (
                  <span className="text-muted-foreground"> — {c.issuingState}</span>
                )}
                <span className="text-muted-foreground">, {c.file.originalName}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    startUploading(async () => {
                      await deleteCredential(c.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={handleUpload} className="space-y-4 rounded-md border p-4">
        {uploadError && (
          <Alert variant="destructive">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="cred-type">Credential type</Label>
          <select
            id="cred-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {type === "TRADE_LICENCE" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="cred-trade">Trade this licence covers</Label>
              <select
                id="cred-trade"
                name="trade"
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-state">Issuing state</Label>
              <select
                id="cred-state"
                name="issuingState"
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-number">Licence number</Label>
              <Input id="cred-number" name="licenceNumber" />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="cred-expiry">Expiry date (if applicable)</Label>
          <Input id="cred-expiry" name="expiryDate" type="date" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cred-file">File (PDF, JPG or PNG, max 10MB)</Label>
          <Input
            id="cred-file"
            name="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            required
          />
        </div>

        <Button type="submit" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload credential"}
        </Button>
      </form>

      <div className="border-t pt-4">
        {submitError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        {profileStatus === "PENDING_REVIEW" || profileStatus === "LIVE" ? (
          <p className="text-muted-foreground text-sm">
            Your profile has been submitted (status: {profileStatus}).
          </p>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        )}
      </div>
    </div>
  );
}
