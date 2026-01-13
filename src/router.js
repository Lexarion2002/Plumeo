import { getUser } from "./auth.js"

export async function route() {
  const hash = window.location.hash || "#login"
  const userResult = await getUser()

  if (!userResult.ok) {
    return {
      page: "login",
      props: { message: userResult.errorMessage }
    }
  }

  if (hash === "#app" && userResult.user === null) {
    window.location.hash = "#login"
    return {
      page: "login",
      props: { message: "Veuillez vous connecter." }
    }
  }

  if (hash === "#app") {
    return {
      page: "app",
      props: { userEmail: userResult.user?.email ?? "" }
    }
  }

  return {
    page: "login",
    props: { message: "" }
  }
}
