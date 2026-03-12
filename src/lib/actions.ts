"use server";

import { redirect } from "next/navigation";
import { createProject, updateProject, deleteProject } from "./store";
import { createClient } from "./supabase/server";

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/projects");
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check your email to confirm your account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createProjectAction(formData: FormData) {
  const address = formData.get("address") as string;
  const clientName = formData.get("clientName") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!address || !clientName) {
    throw new Error("Address and client name are required");
  }

  const project = await createProject({
    address,
    clientName,
    notes,
  });
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const id = formData.get("id") as string;
  const address = formData.get("address") as string;
  const clientName = formData.get("clientName") as string;
  const notes = (formData.get("notes") as string) || "";
  const status = formData.get("status") as string;

  if (!id || !address || !clientName) {
    throw new Error("Missing required fields");
  }

  await updateProject(id, {
    address,
    clientName,
    notes,
    status: status as "draft" | "sent" | "won" | "lost",
  });

  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const id = formData.get("id") as string;
  await deleteProject(id);
  redirect("/projects");
}
