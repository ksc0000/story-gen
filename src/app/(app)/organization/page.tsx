"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Building2,
  Users,
  Copy,
  RefreshCw,
  Loader2,
  Sparkles,
  KeyRound,
  GraduationCap,
  Plus,
  ChevronRight,
  UserMinus,
  LogOut,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { EnterpriseGate } from "@/components/enterprise-gate";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import {
  createOrganizationCallable,
  joinOrganizationByCodeCallable,
  rotateInviteCodeCallable,
  leaveOrganizationCallable,
  removeOrgMemberCallable,
} from "@/lib/functions";
import type { Organization, OrgMember, OrgClass, OrgRole } from "@/lib/types";

function roleLabel(role?: OrgRole): string {
  return role === "org_admin" ? "管理者" : role === "teacher" ? "先生" : "";
}

export default function OrganizationPage() {
  return (
    <EnterpriseGate>
      <OrganizationPageContent />
    </EnterpriseGate>
  );
}

function OrganizationPageContent() {
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
        <h1 className="text-2xl font-bold text-purple-900">団体契約</h1>
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
  const confirm = useConfirm();
  const toast = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [leaving, setLeaving] = useState(false);

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

  const handleRemoveMember = async (targetUid: string, name: string) => {
    if (
      !(await confirm({
        title: "メンバーを削除",
        description: `${name} さんを団体から削除しますか？`,
        confirmLabel: "削除する",
        variant: "destructive",
      }))
    )
      return;
    try {
      await removeOrgMemberCallable(targetUid);
      toast.success(`${name} さんを削除しました`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました。");
    }
  };

  const handleLeave = async () => {
    if (leaving) return;
    if (
      !(await confirm({
        title: "団体から退会",
        description: "この団体から退会しますか？",
        confirmLabel: "退会する",
        variant: "destructive",
      }))
    )
      return;
    setLeaving(true);
    try {
      await leaveOrganizationCallable();
      await user?.getIdToken(true); // claim 反映
      window.location.href = "/organization";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "退会に失敗しました。");
      setLeaving(false);
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
          <CardContent className="p-0">
            <Link
              href={`/organization/billing?orgId=${orgId}`}
              className="flex items-center justify-between p-4 transition hover:bg-violet-50/50"
            >
              <span className="flex items-center gap-2 font-semibold text-purple-900">
                <Building2 className="size-4 text-violet-400" /> プランと請求
              </span>
              <ChevronRight className="size-5 text-violet-300" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

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

      <ClassesSection orgId={orgId} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-purple-500" /> メンバー（{members.length}人）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => {
            const isOwnerMember = org?.ownerUid === m.id;
            const isSelf = user?.uid === m.id;
            const canRemove = isAdmin && !isOwnerMember && !isSelf;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-violet-100 px-4 py-3"
              >
                <span className="text-sm font-medium text-purple-900">
                  {m.displayName}
                  {isSelf ? "（あなた）" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                    {roleLabel(m.role)}
                  </span>
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id!, m.displayName)}
                      className="text-violet-300 transition hover:text-red-500"
                      aria-label="削除"
                    >
                      <UserMinus className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {members.length === 0 ? (
            <p className="text-sm text-violet-400">読み込み中...</p>
          ) : null}
        </CardContent>
      </Card>

      {/* 退会（作成者以外） */}
      {org && user && org.ownerUid !== user.uid ? (
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving}
              className="flex w-full items-center justify-center gap-2 p-4 text-sm font-semibold text-red-500 transition hover:bg-red-50/50 disabled:opacity-50"
            >
              {leaving ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              この団体から退会する
            </button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ClassesSection({ orgId }: { orgId: string }) {
  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "organizations", orgId, "classes"), orderBy("name", "asc")),
      (snap) => setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrgClass))
    );
    return unsub;
  }, [orgId]);

  const addClass = async () => {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await addDoc(collection(db, "organizations", orgId, "classes"), {
        name,
        studentCount: 0,
        createdBy: user?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      setNewName("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="size-4 text-purple-500" /> クラス（{classes.length}）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/organization/class?orgId=${orgId}&classId=${c.id}`}
            className="flex items-center justify-between rounded-2xl border border-violet-100 px-4 py-3 transition hover:bg-violet-50/50"
          >
            <span className="text-sm font-medium text-purple-900">{c.name}</span>
            <span className="flex items-center gap-2 text-xs text-violet-400">
              {c.studentCount ?? 0}人
              <ChevronRight className="size-4 text-violet-300" />
            </span>
          </Link>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ひまわり組"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter") addClass();
            }}
          />
          <Button variant="outline" onClick={addClass} disabled={!newName.trim() || adding}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
