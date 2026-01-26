import { getUser } from "./auth.js"

export async function route() {
  const hash = window.location.hash || "#/home"
  const userResult = await getUser()

  if (!userResult.ok) {
    return {
      page: "login",
      props: { message: userResult.errorMessage }
    }
  }

  if (userResult.user === null) {
    if (hash !== "#login" && hash !== "#/login") {
      window.location.hash = "#login"
    }
    return {
      page: "login",
      props: { message: "Veuillez vous connecter." }
    }
  }

  if (hash === "#login" || hash === "#/login" || hash === "#app") {
    window.location.hash = "#/home"
    return {
      page: "home",
      props: { userEmail: userResult.user?.email ?? "" }
    }
  }

  if (hash === "#/home") {
    return {
      page: "home",
      props: { userEmail: userResult.user?.email ?? "" }
    }
  }

  if (hash === "#/ideas") {
    window.location.hash = "#/projects"
    return {
      page: "projects",
      props: { userEmail: userResult.user?.email ?? "" }
    }
  }

  if (hash === "#/projects") {
    return {
      page: "projects",
      props: { userEmail: userResult.user?.email ?? "" }
    }
  }

  if (hash.startsWith("#/project/")) {
    const parts = hash.replace("#/project/", "").split("/").filter(Boolean)
    const projectId = parts[0]
    if (!projectId) {
      window.location.hash = "#/projects"
      return {
        page: "projects",
        props: { userEmail: userResult.user?.email ?? "" }
      }
    }
    const subview = parts[1] ?? "write"
    const navMap = {
      write: "chapter",
      characters: "characters",
      ideas: "ideas",
      inspiration: "inspiration",
      mindmap: "mindmap",
      stats: "stats",
      knowledge: "knowledge",
      settings: "chapter"
    }
    if (!(subview in navMap)) {
      window.location.hash = `#/project/${projectId}/write`
    }
    return {
      page: "editor",
      props: {
        userEmail: userResult.user?.email ?? "",
        projectId,
        writingNav: navMap[subview] ?? "chapter"
      }
    }
  }

  if (hash.startsWith("#/editor/")) {
    const projectId = hash.replace("#/editor/", "").trim()
    if (!projectId) {
      window.location.hash = "#/projects"
      return {
        page: "projects",
        props: { userEmail: userResult.user?.email ?? "" }
      }
    }
    window.location.hash = `#/project/${projectId}/write`
    return {
      page: "editor",
      props: {
        userEmail: userResult.user?.email ?? "",
        projectId,
        writingNav: "chapter"
      }
    }
  }

  window.location.hash = "#/home"
  return {
    page: "home",
    props: { userEmail: userResult.user?.email ?? "" }
  }
}
