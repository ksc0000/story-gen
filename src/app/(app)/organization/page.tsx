"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { Building2, Users, Copy, RefreshCw, Loader2, Sparkles, KeyRound } from "lucide-react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import {
  createOrganizationCallable,
  joinOrganizationByCodeCallable,
  rotateInviteCodeCallable,
} from "@/lib/functions";
import type { Organization, OrgMember, OrgRole } from "@/lib/types";

function roleLabel(role?: OrgRole): string {
  return role === "org_admin" ? "管理者" : role === "teacher" ? "先生" : "";
}

export default function OrganizationPage() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-violet-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-3xl px-4 py-6">
      <BackButton className="mb-3" />
      <div className="mb-6 flex items-center gap-2">
        <Building2 className="size-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-purple-900">園・団体（エンタープライズ）</h1>
      </div>
      {profile?.orgId ? (
        <OrgHome orgId={profile.orgId} role={profile.orgRole} />
      ) : (
        <NoOrgView displayName={profile?.displayName} />
      )}
    </PageTransition>
  );
}

function NoOrgView({ displayName }: { displayName?: string }) {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [code, setCode] = useState("");
  const [teacherName, setTeacherName] = useState(displayName ?? "");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const afterMembership = async () => {
    // custom claim(orgId/orgRole) を反映するため ID トークンを更新する。
    await user?.getIdToken(true);
  };

  const handleCreate = async () => {
    if (!orgName.trim() || busy) return;
    setBusy("create");
    setError(null);
    try {
      await createOrganizationCallable(orgName.trim());
      await afterMembership();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました。");
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy("join");
    setError(null);
    try {
      await joinOrganizationByCodeCallable({ code: code.trim(), displayName: teacherName.trim() });
      await afterMembership();
    } catch (e) {
      setError(e instanceof Error ? e.message : "参加に失敗しました。");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-violet-600">
        保育園・幼稚園などの団体で Ehoria を使うための機能です。団体を新しく作るか、招待コードで参加できます。
      </p>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-purple-500" /> 団体を新しく作る
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="org-name">園・団体名</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="ひまわり保育園"
              maxLength={60}
            />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!orgName.trim() || busy !== null}>
            {busy === "create" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            団体を作成して管理者になる
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-purple-500" /> 招待コードで参加する
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="join-code">招待コード</Label>
            <Input
              id="join-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD2345"
              className="tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-name">あなたの表示名</Label>
            <Input
              id="teacher-name"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="やまだ先生"
              maxLength={40}
            />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleJoin}
            disabled={!code.trim() || busy !== null}
          >
            {busy === "join" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            この団体に参加する
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OrgHome({ orgId, role }: { orgId: string; role?: OrgRole }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    // rules は custom claim を参照するため、初回に ID トークンを更新してから購読する。
    let unsubOrg = () => {};
    let unsubMembers = () => {};
    (async () => {
      await user?.getIdToken(true);
      unsubOrg = onSnapshot(doc(db, "organizations", orgId), (snap) => {
        setOrg(snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null);
      });
      unsubMembers = onSnapshot(
        query(collection(db, "organizations", orgId, "members"), orderBy("joinedAt", "asc")),
        (snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrgMember))
      );
    })();
    return () => {
      unsubOrg();
      unsubMembers();
    };
  }, [orgId, user]);

  const isAdmin = role === "org_admin";

  const copyCode = async () => {
    if (!org?.inviteCode) return;
    await navigator.clipboard.writeText(org.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRotate = async () => {
    if (rotating) return;
    setRotating(true);
    try {
      await rotateInviteCodeCallable();
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-semibold text-violet-400">所属団体</p>
            <p className="mt-1 text-xl font-bold text-purple-900">{org?.name ?? "..."}</p>
          </div>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
            {roleLabel(role)}
          </span>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-purple-500" /> 先生を招待する
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-violet-600">
              先生にこの招待コードを伝えてください。「招待コードで参加」から入力すると、この団体に参加できます。
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-purple-800">
                {org?.inviteCode ?? "········"}
              </div>
              <Button variant="outline" size="icon" onClick={copyCode} title="コピー">
                <Copy className="size-4" />
              </Button>
            </div>
            {copied ? <p className="text-xs text-emerald-600">コピーしました。</p> : null}
            <Button variant="ghost" className="text-violet-500" onClick={handleRotate} disabled={rotating}>
              {rotating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              コードを再発行する
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-purple-500" /> メンバー（{members.length}人）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl border border-violet-100 px-4 py-3"
            >
              <span className="text-sm font-medium text-purple-900">{m.displayName}</span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                {roleLabel(m.role)}
              </span>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-sm text-violet-400">読み込み中...</p>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-violet-400">
        クラス名簿・一括生成・法人請求は今後のアップデートで提供予定です。
      </p>
    </div>
  );
}
