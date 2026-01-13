import { supabase } from "./supabaseClient.js"

export async function signUp(email, password) {
  try {
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function signIn(email, password) {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, user: data.user ?? null }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}
