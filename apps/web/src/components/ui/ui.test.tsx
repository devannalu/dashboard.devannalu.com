import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "./button";
import { Progress } from "./display";
import { Field, Input } from "./field";

describe("Button", () => {
  it("em carregamento fica desabilitado e não dispara clique", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Salvar</Button>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("botão só de ícone tem nome acessível", () => {
    render(<IconButton label="Excluir item"><svg /></IconButton>);
    expect(screen.getByRole("button", { name: "Excluir item" })).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("liga rótulo, erro e estado inválido ao campo", () => {
    render(
      <Field label="E-mail" error="Informe um e-mail válido.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("E-mail");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Informe um e-mail válido.");
  });
});

describe("Progress", () => {
  it("sem dados mostra 'Sem tarefas' e não inventa 0%", () => {
    render(<Progress label="Progresso" value={null} />);
    const bar = screen.getByRole("progressbar", { name: "Progresso" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("aria-valuetext", "Sem tarefas");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("arredonda e limita o valor entre 0 e 100", () => {
    render(<Progress label="Progresso" value={62.4} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "62");
  });
});
