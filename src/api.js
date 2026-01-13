import { supabase } from "./supabaseClient.js"

export async function getUserId() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      return { ok: false, errorMessage: error.message }
    }
    if (!data.user) {
      return { ok: false, errorMessage: "User not authenticated" }
    }
    return { ok: true, userId: data.user.id }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function listProjects() {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,created_at")
      .eq("user_id", userResult.userId)
      .order("created_at", { ascending: true })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data: data ?? [] }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function createProject(title) {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({ title, user_id: userResult.userId })
      .select("id,title,created_at")
      .single()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function renameProject(id, title) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .update({ title })
      .eq("id", id)
      .select("id,title")
      .single()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function listChapters(projectId) {
  try {
    const { data, error } = await supabase
      .from("chapters")
      .select("id,project_id,title,order_index,revision")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data: data ?? [] }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function createChapter(projectId, title, orderIndex) {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        project_id: projectId,
        title,
        order_index: orderIndex,
        user_id: userResult.userId
      })
      .select("id,project_id,title,order_index,revision,content_md")
      .single()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function getChapter(id) {
  try {
    const { data, error } = await supabase
      .from("chapters")
      .select("id,project_id,title,content_md,order_index,revision")
      .eq("id", id)
      .single()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function fetchChapter(id) {
  return getChapter(id)
}

export async function updateChapter(id, patch) {
  try {
    const { data, error } = await supabase
      .from("chapters")
      .update(patch)
      .eq("id", id)
      .select("id")
      .single()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function rpcUpdateChapterIfRevision({
  id,
  title,
  content_md,
  baseRevision
}) {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const { data, error } = await supabase.rpc("update_chapter_if_revision", {
      p_id: id,
      p_user_id: userResult.userId,
      p_title: title,
      p_content_md: content_md,
      p_base_revision: baseRevision
    })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, newRevision: data ?? -1 }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function listVersions(chapterId) {
  try {
    const { data, error } = await supabase
      .from("versions")
      .select("id,chapter_id,label,content_md,created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data: data ?? [] }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function createVersion(chapterId, content_md, label = null) {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const { data, error } = await supabase
      .from("versions")
      .insert({
        chapter_id: chapterId,
        user_id: userResult.userId,
        content_md,
        label
      })
      .select("id,chapter_id,label,content_md,created_at")
      .single()

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, data }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}
