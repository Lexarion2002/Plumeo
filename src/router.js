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

  if (hash.startsWith("#/editor/")) {
    const projectId = hash.replace("#/editor/", "").trim()
    return {
      page: "editor",
      props: {
        userEmail: userResult.user?.email ?? "",
        projectId
      }
    }
  }

  window.location.hash = "#/home"
  return {
    page: "home",
    props: { userEmail: userResult.user?.email ?? "" }
  }
}
