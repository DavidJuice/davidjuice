"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  _count: { members: number };
}
interface PhoneNumber {
  id: string;
  number: string;
  friendlyName?: string;
}
interface Template {
  id: string;
  name: string;
  body: string;
}

const STEPS = ["Contacts", "Message", "Phone & Options", "Review & Send"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [phones, setPhones] = useState<PhoneNumber[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [includeOptOut, setIncludeOptOut] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts/groups").then((r) => r.json()),
      fetch("/api/phone-numbers").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([g, p, t]) => {
      setGroups(g.groups ?? []);
      setPhones(p.numbers ?? []);
      setTemplates(t.templates ?? []);
    });
  }, []);

  function applyTemplate(templateId: string) {
    const t = templates.find((t) => t.id === templateId);
    if (t) setMessage(t.body);
    setSelectedTemplate(templateId);
  }

  async function handleSend() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        message,
        phoneNumberId: selectedPhone,
        contactGroupId: selectedGroup,
        templateId: selectedTemplate || null,
        includeOptOut,
        scheduledAt: scheduledAt || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create campaign");
      setLoading(false);
      return;
    }

    const campaignId = data.campaign.id;

    // Immediately trigger send
    await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });

    router.push(`/campaigns/${campaignId}`);
  }

  const canNext =
    step === 0
      ? !!selectedGroup && !!name
      : step === 1
      ? !!message
      : step === 2
      ? !!selectedPhone
      : true;

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">New Campaign</h2>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-blue-600 text-white"
                  : i === step
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium text-gray-900" : "text-gray-400"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 0: Select contacts */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Spring Promotion"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact group *
            </label>
            {groups.length === 0 ? (
              <p className="text-sm text-gray-400">
                No groups yet.{" "}
                <a href="/contacts/upload" className="text-blue-600 hover:underline">
                  Upload contacts first →
                </a>
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedGroup === g.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="group"
                        value={g.id}
                        checked={selectedGroup === g.id}
                        onChange={() => setSelectedGroup(g.id)}
                        className="text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-900">{g.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{g._count.members} contacts</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Write message */}
      {step === 1 && (
        <div className="space-y-5">
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Load from template (optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *{" "}
              <span className="font-normal text-gray-400">
                — use &#123;name&#125; for personalization
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Hi {name}, we have a special offer just for you…"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">
                Supports Korean (한국어) and English
              </p>
              <p className="text-xs text-gray-400">{message.length} chars</p>
            </div>
          </div>
          {selectedGroupData && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium">Note:</p>
              <p className="mt-0.5">
                Contacts in &quot;{selectedGroupData.name}&quot; that have individual messages will use
                their own message. Your message above applies to all others.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Phone & Options */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send from *
            </label>
            {phones.length === 0 ? (
              <p className="text-sm text-gray-400">
                No phone numbers registered.{" "}
                <a href="/phone-numbers" className="text-blue-600 hover:underline">
                  Add one first →
                </a>
              </p>
            ) : (
              <div className="space-y-2">
                {phones.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPhone === p.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="phone"
                      value={p.id}
                      checked={selectedPhone === p.id}
                      onChange={() => setSelectedPhone(p.id)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.friendlyName ?? p.number}
                      </p>
                      {p.friendlyName && (
                        <p className="text-xs text-gray-400">{p.number}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeOptOut}
                onChange={(e) => setIncludeOptOut(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">
                Append opt-out footer (recommended — required for marketing SMS under TCPA)
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-5">
              Appends: &quot;Reply STOP to unsubscribe. Reply HELP for help.&quot;
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave blank to send immediately. Sending is restricted to 8 AM – 9 PM Pacific (WA law).
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            <div className="px-5 py-3 flex justify-between">
              <span className="text-sm text-gray-500">Campaign name</span>
              <span className="text-sm font-medium text-gray-900">{name}</span>
            </div>
            <div className="px-5 py-3 flex justify-between">
              <span className="text-sm text-gray-500">Contact group</span>
              <span className="text-sm font-medium text-gray-900">
                {selectedGroupData?.name} ({selectedGroupData?._count.members} contacts)
              </span>
            </div>
            <div className="px-5 py-3">
              <p className="text-sm text-gray-500 mb-2">Message preview</p>
              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                {message}
                {includeOptOut && (
                  <span className="text-gray-400">
                    {"\n\nMsg from DavidJuice. Reply STOP to unsubscribe. Reply HELP for help."}
                  </span>
                )}
              </p>
            </div>
            <div className="px-5 py-3 flex justify-between">
              <span className="text-sm text-gray-500">Sending from</span>
              <span className="text-sm font-medium text-gray-900">
                {phones.find((p) => p.id === selectedPhone)?.friendlyName ??
                  phones.find((p) => p.id === selectedPhone)?.number}
              </span>
            </div>
            <div className="px-5 py-3 flex justify-between">
              <span className="text-sm text-gray-500">Send time</span>
              <span className="text-sm font-medium text-gray-900">
                {scheduledAt ? new Date(scheduledAt).toLocaleString() : "Immediately"}
              </span>
            </div>
            <div className="px-5 py-3 flex justify-between">
              <span className="text-sm text-gray-500">Opt-out footer</span>
              <span className={`text-sm font-medium ${includeOptOut ? "text-green-600" : "text-red-500"}`}>
                {includeOptOut ? "Included ✓" : "Not included"}
              </span>
            </div>
          </div>

          {!includeOptOut && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ TCPA requires opt-out instructions for marketing SMS. Make sure your messages include
              opt-out instructions if they are marketing messages.
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={loading || !selectedPhone}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Launching…" : scheduledAt ? "Schedule Campaign" : "Send Campaign"}
          </button>
        )}
      </div>
    </div>
  );
}
