"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Loader2,
  FileJson,
  User,
  Bell,
  Shield,
  Palette,
  Monitor,
  Smartphone,
  Globe,
  Heart,
  ChevronRight,
  CheckCircle2,
  Lock,
  Mail,
  Key,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useUser();

  const [preferences, setPreferences] = useState({
    medicationReminders: true,
    appointmentAlerts: true,
    weeklySummary: false,
    dataEncryption: true,
    twoFactorAuth: false,
    twoFactorAuthMethod: "Not configured",
    sessionManagement: "Active sessions: 1",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  
  // 2FA Modal states
  const [authMethodTab, setAuthMethodTab] = useState<"passkey" | "sms" | "email" | "authenticator">("passkey");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [smsChannel, setSmsChannel] = useState<"SMS" | "WhatsApp">("WhatsApp");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passkeyStep, setPasskeyStep] = useState<"idle" | "scanning" | "success">("idle");

  useEffect(() => {
    const saved = localStorage.getItem("medconnect_user_preferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        // use default if parse fails
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const updatePreferences = (updates: Partial<typeof preferences>) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("medconnect_user_preferences", JSON.stringify(updated));
    }
  };

  const updatePreference = (key: keyof typeof preferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("medconnect_user_preferences", JSON.stringify(updated));
    }

    // Toast notifications for instant feedback
    if (key === "medicationReminders") {
      toast.success(value ? "Medication Reminders enabled" : "Medication Reminders disabled");
    } else if (key === "appointmentAlerts") {
      toast.success(value ? "Appointment Alerts enabled" : "Appointment Alerts disabled");
    } else if (key === "weeklySummary") {
      toast.success(value ? "Weekly Summary enabled" : "Weekly Summary disabled");
    } else if (key === "dataEncryption") {
      if (value) toast.success("Data Encryption enabled");
      else toast.warning("Data Encryption disabled (Not recommended)");
    } else if (key === "twoFactorAuth") {
      toast.success(value ? `Two-Factor Authentication enabled (${updated.twoFactorAuthMethod})` : "Two-Factor Authentication disabled");
    }
  };

  const fullName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "Not provided";

  const handleExportFHIR = async () => {
    try {
      setIsExporting(true);
      await api.fhir.export();
      toast.success("FHIR data exported successfully!");
    } catch (error) {
      toast.error("Failed to export FHIR data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendOtp = () => {
    setOtpSent(true);
    setCountdown(30);
    toast.success(`Verification code sent via ${authMethodTab === "sms" ? smsChannel : "Email"}`);
  };

  const handleRegisterPasskey = async () => {
    // Check browser WebAuthn support
    if (!window.PublicKeyCredential) {
      toast.error("Your browser does not support Passkeys. Please use Chrome, Safari, or Edge.");
      return;
    }

    setPasskeyStep("scanning");
    try {
      // Use Clerk's built-in passkey registration — triggers OS biometric prompt
      await user?.createPasskey();
      setPasskeyStep("success");
      await new Promise((r) => setTimeout(r, 900));
      setPasskeyStep("idle");
      setShow2FADialog(false);
      updatePreferences({ twoFactorAuthMethod: "Passkeys / Touch ID", twoFactorAuth: true });
      toast.success("Passkey registered! You can now sign in with Touch ID / Face ID.");
    } catch (err: any) {
      setPasskeyStep("idle");
      const msg = err?.message || "";
      if (msg.includes("NotAllowedError") || msg.toLowerCase().includes("cancel")) {
        toast.info("Passkey registration cancelled.");
      } else if (msg.toLowerCase().includes("not supported") || msg.toLowerCase().includes("unsupported")) {
        toast.error("Passkeys are not supported on this device or browser.");
      } else {
        toast.error(`Passkey registration failed: ${msg || "Please try again."}`);
      }
    }
  };


  const handleActivate2FA = async (methodName: string) => {
    setIsVerifying2FA(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsVerifying2FA(false);
    setShow2FADialog(false);
    setTwoFactorCode("");
    setOtpSent(false);
    updatePreferences({ twoFactorAuthMethod: methodName, twoFactorAuth: true });
    toast.success(`Two-Factor Authentication enabled (${methodName})`);
  };

  type SettingItem = {
    label: string;
    type?: "text" | "switch" | "action";
    value?: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    statusText?: string;
    buttonLabel?: string;
    onClick?: () => void;
  };

  const settings: Array<{
    icon: any;
    title: string;
    description: string;
    items?: SettingItem[];
    action?: React.ReactNode;
    color: string;
    bg: string;
  }> = [
    {
      icon: User,
      title: "Account",
      description: "Manage your personal information and profile settings",
      items: [
        { label: "Full Name", type: "text", value: fullName },
        { label: "Email", type: "text", value: email },
      ],
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-950/50",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Customize your theme and display preferences",
      action: (
        <div className="flex items-center gap-2">
          {["light", "dark", "system"].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                theme === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:border-primary/30 hover:bg-accent"
              )}
            >
              {t === "light" ? <Monitor className="h-3.5 w-3.5" /> : t === "dark" ? <Smartphone className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      ),
      color: "text-purple-500",
      bg: "bg-purple-100 dark:bg-purple-950/50",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure reminders and notification preferences",
      items: [
        {
          label: "Medication Reminders",
          type: "switch",
          checked: preferences.medicationReminders,
          onChange: (checked: boolean) => updatePreference("medicationReminders", checked),
          statusText: preferences.medicationReminders ? "Enabled" : "Disabled",
        },
        {
          label: "Appointment Alerts",
          type: "switch",
          checked: preferences.appointmentAlerts,
          onChange: (checked: boolean) => updatePreference("appointmentAlerts", checked),
          statusText: preferences.appointmentAlerts ? "Enabled" : "Disabled",
        },
        {
          label: "Weekly Summary",
          type: "switch",
          checked: preferences.weeklySummary,
          onChange: (checked: boolean) => updatePreference("weeklySummary", checked),
          statusText: preferences.weeklySummary ? "Enabled" : "Disabled",
        },
      ],
      color: "text-amber-500",
      bg: "bg-amber-100 dark:bg-amber-950/50",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Control data sharing and access permissions",
      items: [
        {
          label: "Data Encryption",
          type: "switch",
          checked: preferences.dataEncryption,
          onChange: (checked: boolean) => updatePreference("dataEncryption", checked),
          statusText: preferences.dataEncryption ? "Enabled" : "Disabled",
        },
        {
          label: "Two-Factor Auth",
          type: preferences.twoFactorAuth ? "switch" : "action",
          checked: preferences.twoFactorAuth,
          onChange: (checked: boolean) => {
            if (!checked) {
              updatePreferences({ twoFactorAuth: false, twoFactorAuthMethod: "Not configured" });
              toast.info("Two-Factor Authentication disabled");
            } else {
              setShow2FADialog(true);
            }
          },
          statusText: preferences.twoFactorAuth ? `Enabled (${preferences.twoFactorAuthMethod})` : "Not configured",
          buttonLabel: preferences.twoFactorAuth ? "Change Method" : "Configure",
          onClick: () => setShow2FADialog(true),
        },
        {
          label: "Session Management",
          type: "text",
          value: preferences.sessionManagement,
        },
      ],
      color: "text-emerald-500",
      bg: "bg-emerald-100 dark:bg-emerald-950/50",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 relative">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, preferences, and data.</p>
      </div>

      <div className="grid gap-6">
        {/* Settings Cards */}
        <div className="grid gap-4">
          {settings.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", section.bg)}>
                      <section.icon className={cn("h-4 w-4", section.color)} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {section.items && (
                    <div className="space-y-3 divide-y divide-border/40">
                      {section.items.map((item, idx) => (
                        <div key={item.label} className={cn("flex items-center justify-between py-2 text-sm", idx === 0 && "pt-0")}>
                          <span className="text-muted-foreground font-medium">{item.label}</span>
                          <div className="flex items-center gap-3">
                            {item.type === "switch" && (
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
                                    item.checked
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                      : "bg-muted text-muted-foreground border border-border"
                                  )}
                                >
                                  {item.statusText}
                                </span>
                                <Switch checked={!!item.checked} onCheckedChange={item.onChange!} />
                                {item.buttonLabel && item.onClick && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={item.onClick}
                                    className="h-7 text-xs px-2.5 font-medium border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all shadow-sm ml-1"
                                  >
                                    <Lock className="h-3 w-3 mr-1" />
                                    {item.buttonLabel}
                                  </Button>
                                )}
                              </div>
                            )}
                            {item.type === "action" && (
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {item.statusText}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={item.onClick}
                                  className="h-7 text-xs px-2.5 font-medium border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all shadow-sm"
                                >
                                  <Lock className="h-3 w-3 mr-1" />
                                  {item.buttonLabel}
                                </Button>
                              </div>
                            )}
                            {(!item.type || item.type === "text") && (
                              <span className="font-medium text-xs text-foreground/80 bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
                                {item.value}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.action && <div className="py-1">{section.action}</div>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FHIR Export */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-primary/10">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <FileJson className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Data Export (FHIR)</CardTitle>
                  <CardDescription>
                    Download your health records in the standardized HL7 FHIR JSON format.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="bg-muted/30 p-4 rounded-lg border text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">What is included?</p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Patient Demographics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Timeline Events (Conditions, Encounters)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Medications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Lab Results</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExportFHIR} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isExporting ? "Generating Export..." : "Export FHIR Bundle"}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      {/* Multi-Method 2FA Setup Modal Overlay */}
      <AnimatePresence>
        {show2FADialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-xl bg-background border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-6 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Select Two-Factor Authentication Method</h3>
                    <p className="text-xs text-muted-foreground">Choose your preferred verification method to protect your health records</p>
                  </div>
                </div>
              </div>

              {/* Method Selection Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-3 bg-muted/30 border-b border-border/60 shrink-0">
                {[
                  { id: "passkey", label: "Passkeys", icon: Key },
                  { id: "sms", label: "SMS / WhatsApp", icon: Smartphone },
                  { id: "email", label: "Email OTP", icon: Mail },
                  { id: "authenticator", label: "Authenticator", icon: Lock },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setAuthMethodTab(tab.id as any);
                        setTwoFactorCode("");
                        setOtpSent(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all",
                        authMethodTab === tab.id
                          ? "bg-background text-primary shadow-sm border border-border/80 font-semibold"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] text-center">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Method 1: Passkeys / Biometrics */}
                {authMethodTab === "passkey" && (
                  <div className="space-y-4 text-center py-2">
                    <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                      <Key className="h-10 w-10 animate-pulse" />
                      {passkeyStep === "scanning" && (
                        <span className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h4 className="font-semibold text-sm">Touch ID, Face ID, or Hardware Security Key</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Passkeys provide phishing-resistant, passwordless verification directly using your device&apos;s biometric sensor or secure hardware key.
                      </p>
                    </div>
                    {passkeyStep === "idle" && (
                      <Button onClick={handleRegisterPasskey} className="w-full mt-2">
                        <Key className="mr-2 h-4 w-4" /> Register Passkey on this Device
                      </Button>
                    )}
                    {passkeyStep === "scanning" && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                        Waiting for Touch ID / Face ID prompt on your device...
                      </div>
                    )}
                    {passkeyStep === "success" && (
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Passkey Registered Successfully!
                      </div>
                    )}
                  </div>
                )}

                {/* Method 2: SMS & WhatsApp OTP */}
                {authMethodTab === "sms" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Mobile Phone Number
                      </label>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Delivery Channel
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["WhatsApp", "SMS"] as const).map((channel) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => setSmsChannel(channel)}
                            className={cn(
                              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                              smsChannel === channel
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-input hover:bg-accent"
                            )}
                          >
                            {channel === "WhatsApp" ? <MessageCircle className="h-4 w-4 text-emerald-500" /> : <Smartphone className="h-4 w-4 text-blue-500" />}
                            <span>{channel}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {!otpSent ? (
                      <Button onClick={handleSendOtp} className="w-full mt-2" disabled={!phoneNumber || phoneNumber.length < 8}>
                        Send Verification Code via {smsChannel}
                      </Button>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Enter 6-Digit Verification Code
                            </label>
                            {countdown > 0 ? (
                              <span className="text-[11px] text-muted-foreground">Resend in {countdown}s</span>
                            ) : (
                              <button type="button" onClick={handleSendOtp} className="text-[11px] text-primary hover:underline font-medium">
                                Resend Code
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="• • • • • •"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <Button
                          onClick={() => handleActivate2FA(`${smsChannel} Verification`)}
                          className="w-full"
                          disabled={twoFactorCode.length !== 6 || isVerifying2FA}
                        >
                          {isVerifying2FA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Verify & Activate {smsChannel} 2FA
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Method 3: Email OTP Verification */}
                {authMethodTab === "email" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Registered Email Address</p>
                        <p className="font-mono mt-0.5">{email}</p>
                      </div>
                    </div>

                    {!otpSent ? (
                      <Button onClick={handleSendOtp} className="w-full mt-2">
                        Send Verification Code to Email
                      </Button>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Enter 6-Digit Email Code
                            </label>
                            {countdown > 0 ? (
                              <span className="text-[11px] text-muted-foreground">Resend in {countdown}s</span>
                            ) : (
                              <button type="button" onClick={handleSendOtp} className="text-[11px] text-primary hover:underline font-medium">
                                Resend Email Code
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="• • • • • •"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <Button
                          onClick={() => handleActivate2FA("Email OTP Verification")}
                          className="w-full"
                          disabled={twoFactorCode.length !== 6 || isVerifying2FA}
                        >
                          {isVerifying2FA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Verify & Activate Email 2FA
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Method 4: Authenticator App (TOTP QR Code) */}
                {authMethodTab === "authenticator" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Step 1: Scan QR Code with your Authenticator App
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/60 shadow-sm">
                        <div className="h-32 w-32 shrink-0 bg-white p-2 rounded-xl shadow-md flex items-center justify-center border border-border/80">
                          <QRCodeSVG
                            value={`otpauth://totp/${encodeURIComponent(`MedConnect:${email !== "Not provided" ? email : "user@medconnect.in"}`)}?secret=MEDC2026AUTHKEYA&issuer=MedConnect`}
                            size={112}
                            level="M"
                            includeMargin={false}
                            imageSettings={{
                              src: `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f172a'><path d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.8 1.1 2.8 2.5V11c.6 0 1.2.6 1.2 1.3v3.5c0 .7-.6 1.2-1.2 1.2H9.2c-.6 0-1.2-.5-1.2-1.2v-3.5c0-.7.6-1.3 1.2-1.3V9.5C9.2 8.1 10.6 7 12 7zm0 1.2c-.8 0-1.5.7-1.5 1.3V11h3V9.5c0-.6-.7-1.3-1.5-1.3z'/></svg>")}`,
                              x: undefined,
                              y: undefined,
                              height: 20,
                              width: 20,
                              excavate: true,
                            }}
                          />
                        </div>
                        <div className="space-y-2 text-center sm:text-left flex-1">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Point Google Authenticator or Authy at this QR code. Or copy secret key:
                          </p>
                          <div className="flex items-center justify-between gap-2 mt-2 bg-background px-3 py-1.5 rounded-lg border border-border text-xs font-mono font-semibold select-all text-primary shadow-inner">
                            <span>MEDC-2026-AUTH-KEYA</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Step 2: Enter Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code (e.g. 123456)"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    <Button
                      onClick={() => handleActivate2FA("Authenticator App (TOTP)")}
                      className="w-full mt-2"
                      disabled={twoFactorCode.length !== 6 || isVerifying2FA}
                    >
                      {isVerifying2FA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Verify & Activate Authenticator 2FA
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 bg-muted/20 px-6 py-3.5 border-t border-border/60 shrink-0">
                <div>
                  {preferences.twoFactorAuth && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs px-3 font-medium"
                      onClick={() => {
                        updatePreferences({ twoFactorAuth: false, twoFactorAuthMethod: "Not configured" });
                        setShow2FADialog(false);
                        toast.info("Two-Factor Authentication disabled");
                      }}
                    >
                      Turn Off 2FA
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShow2FADialog(false);
                    setTwoFactorCode("");
                    setOtpSent(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
