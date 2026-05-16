import { Navigate, Route, Routes } from "react-router";
import "./App.css";
import { useLocalBinders } from "./hooks/useLocalBinders";
import { BinderEditorPage } from "./pages/BinderEditorPage";
import { HomePage } from "./pages/HomePage";
import { MyBindersPage } from "./pages/MyBindersPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublicBinderPage } from "./pages/PublicBinderPage";

function App() {
  const {
    state,
    lastActiveBinderId,
    setActiveBinder,
    selectCard,
    removeCard,
    changeStatus,
    updateBinderName,
    updateBinderDescription,
    changeLayout,
    createShareLink,
    disableShareLink,
    createBinder,
    deleteBinder,
    resetAllLocalData,
  } = useLocalBinders();

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
            onChangeLayout={changeLayout}
            onCreateShareLink={createShareLink}
            onDisableShareLink={disableShareLink}
            onResetAllLocalData={resetAllLocalData}
          />
        }
      />

      <Route
        path="/share/:shareId"
        element={<PublicBinderPage binders={state.binders} />}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;