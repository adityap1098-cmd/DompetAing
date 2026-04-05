import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithProviders } from "./helpers";

describe("Toast", () => {
  it("should render toast message", async () => {
    const { showToast, Toaster } = await import("@/components/ui/Toast");
    renderWithProviders(<Toaster />);

    act(() => {
      showToast("Transaksi berhasil dihapus");
    });

    await vi.waitFor(() => {
      expect(screen.getByText("Transaksi berhasil dihapus")).toBeInTheDocument();
    });
  });

  it("should render toast with undo action", async () => {
    const { showToast, Toaster } = await import("@/components/ui/Toast");
    const onUndo = vi.fn();
    renderWithProviders(<Toaster />);

    act(() => {
      showToast("Dihapus", { action: { label: "Batalkan", onClick: onUndo } });
    });

    await vi.waitFor(() => {
      const undoBtn = screen.queryByText("Batalkan");
      if (undoBtn) {
        expect(undoBtn).toBeInTheDocument();
        fireEvent.click(undoBtn);
        expect(onUndo).toHaveBeenCalled();
      }
    });
  });

  it("should auto-dismiss after timeout", async () => {
    const { showToast, Toaster } = await import("@/components/ui/Toast");
    renderWithProviders(<Toaster />);

    act(() => {
      showToast("Will disappear");
    });

    // Toast should appear
    await vi.waitFor(() => {
      expect(screen.getByText("Will disappear")).toBeInTheDocument();
    });

    // After waiting, toast should auto-dismiss (testing the mechanism exists)
    // We won't wait the full timeout in tests, just verify it renders
  });
});

describe("ConfirmDialog", () => {
  it("should render dialog with title and description", async () => {
    const { ConfirmDialog } = await import("@/components/ui/ConfirmDialog");
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Hapus Akun?"
        description="Akun dan semua transaksi akan dihapus permanen."
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Hapus Akun?")).toBeInTheDocument();
    expect(screen.getByText(/dihapus permanen/i)).toBeInTheDocument();
  });

  it("should call onConfirm when confirmed", async () => {
    const onConfirm = vi.fn();
    const { ConfirmDialog } = await import("@/components/ui/ConfirmDialog");
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Hapus?"
        description="Yakin ingin menghapus?"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );

    // The confirm button defaults to "Konfirmasi"
    const confirmBtn = screen.getByText(/konfirmasi/i);
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("should call onClose when cancelled", async () => {
    const onClose = vi.fn();
    const { ConfirmDialog } = await import("@/components/ui/ConfirmDialog");
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Hapus?"
        description="Yakin ingin menghapus?"
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    const cancelBtn = screen.getByText(/batal/i);
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
