import { Navigate, Route, Routes, useLocation } from "react-router";
import { getStoredAuthSession } from "./auth/cognito";
import "./App.css";
import { useApiBinders } from "./hooks/useApiBinders";
import { BinderEditorPage } from "./pages/BinderEditorPage";
import { HomePage } from "./pages/HomePage";
import { MyBindersPage } from "./pages/MyBindersPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublicBinderPage } from "./pages/PublicBinderPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  const location = useLocation();
  const hasAuthSession = !!getStoredAuthSession();

  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  const isPublicRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/share/") ||
    isAuthRoute;

  const {
    state,
    lastActiveBinderId,
    setActiveBinder,
    selectCard,
    removeCard,
    changeStatus,
    updateBinderName,
    updateBinderDescription,
    createShareLink,
    disableShareLink,
    createBinder,
    deleteBinder,
    resetAllLocalData,
    updatePreviewPageColor,
    isLoading,
    errorMessage,
    reloadBinders,
  } = useApiBinders({
    enabled: hasAuthSession,
  });

  if (!hasAuthSession && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="not-found-card">
          <p className="eyebrow">Loading</p>
          <h1>Loading your binders...</h1>
        </section>
      </main>
    );
  }

  if (errorMessage && state.binders.length === 0) {
    return (
      <main className="app-shell">
        <section className="not-found-card">
          <p className="eyebrow">API Error</p>
          <h1>Could not load your binders.</h1>
          <p>{errorMessage}</p>

          <button
            className="primary-button button-reset"
            type="button"
            onClick={() => void reloadBinders()}
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            binderCount={state.binders.length}
            lastActiveBinderId={lastActiveBinderId}
          />
        }
      />

      <Route
        path="/my-binders"
        element={
          <MyBindersPage
            binders={state.binders}
            onCreateBinder={createBinder}
            onDeleteBinder={deleteBinder}
            onResetAllLocalData={resetAllLocalData}
          />
        }
      />

      <Route
        path="/binders"
        element={<Navigate to={`/binders/${lastActiveBinderId}`} replace />}
      />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/binders/:binderId"
        element={
          <BinderEditorPage
            binders={state.binders}
            onSetActiveBinder={setActiveBinder}
            onCreateBinder={createBinder}
            onDeleteBinder={deleteBinder}
            onSelectCard={selectCard}
            onRemoveCard={removeCard}
            onChangeStatus={changeStatus}
            onUpdateBinderName={updateBinderName}
            onUpdateBinderDescription={updateBinderDescription}
            onCreateShareLink={createShareLink}
            onDisableShareLink={disableShareLink}
            onResetAllLocalData={resetAllLocalData}
            onUpdatePreviewPageColor={updatePreviewPageColor}
          />
        }
      />

      <Route path="/share/:shareId" element={<PublicBinderPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;