"use client";

import React, { useState } from "react";
import {
  User,
  Sparkles,
  Save,
  CheckCircle2,
  Server,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/store/workspace-context";

export default function SettingsPage() {
  const { settings, updateSettings, isDbConnected } = useWorkspace();

  const [workspaceName, setWorkspaceName] = useState(settings.workspaceName);
  const [userName, setUserName] = useState(settings.userName);
  const [userEmail, setUserEmail] = useState(settings.userEmail);
  const [claudeModel, setClaudeModel] = useState(settings.claudeModel);
  const [defaultDuration, setDefaultDuration] = useState(
    settings.defaultMeetingDuration.toString()
  );
  const [autoExtractTasks, setAutoExtractTasks] = useState(settings.autoExtractTasks);
  const [emailNotifications, setEmailNotifications] = useState(settings.emailNotifications);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      workspaceName: workspaceName.trim(),
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      claudeModel,
      defaultMeetingDuration: parseInt(defaultDuration, 10) || 45,
      autoExtractTasks,
      emailNotifications,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Workspace & Profile Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage workspace identity, Anthropic Claude AI preferences, and system defaults.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Your workspace settings have been updated and saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Workspace Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600" />
              <CardTitle>Workspace Identity</CardTitle>
            </div>
            <CardDescription>
              Shared workspace configuration used across team syncs and document generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Workspace Name
                </label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. DigiPlus Core Workspace"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Default Meeting Duration (Minutes)
                </label>
                <Select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-sky-600" />
              <CardTitle>User Profile</CardTitle>
            </div>
            <CardDescription>
              Your personal identity for assigning tasks and authoring knowledge docs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Display Name
                </label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="alex@digiplus.internal"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claude AI & Model Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600" />
              <CardTitle>Claude AI Configuration</CardTitle>
            </div>
            <CardDescription>
              Fine-tune the intelligence engine used for meeting summaries, task extraction, and catch-up briefs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Anthropic Model
              </label>
              <Select
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
              >
                <option value="claude-3-5-sonnet-20241022">
                  Claude 3.5 Sonnet (Recommended – High Speed & Superior Reasoning)
                </option>
                <option value="claude-3-opus-20240229">
                  Claude 3 Opus (Maximum Depth)
                </option>
                <option value="claude-3-5-haiku-20241022">
                  Claude 3.5 Haiku (Ultra Fast Execution)
                </option>
              </Select>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoExtractTasks}
                  onChange={(e) => setAutoExtractTasks(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>Automatically convert extracted action items into tracked tasks</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>Enable async catch-up brief notifications</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* System & Cloud Integrations Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-sky-600" />
              <CardTitle>Platform Integrations Health</CardTitle>
            </div>
            <CardDescription>
              Backend services and security boundaries inspection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Supabase PostgreSQL</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isDbConnected ? "Remote tables synced" : "Pending .env.local configuration"}
                  </p>
                </div>
                <Badge variant={isDbConnected ? "success" : "warning"}>
                  {isDbConnected ? "Connected" : "Local Mode"}
                </Badge>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Anthropic Claude API</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Endpoint: /api/ai/meeting-notes</p>
                </div>
                <Badge variant="teal">Integrated</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" size="md" className="bg-sky-600 hover:bg-sky-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
