import './PageStageHeader.css';

type Props = {
  title: string;
  stage?: string;
};

/** Faixa de contexto da tela (inspirada no Semplice — etapa + título). */
export function PageStageHeader({ title, stage }: Props) {
  return (
    <header className="page-stage-bar">
      <h2 className="page-stage-title">{title}</h2>
      {stage ? <span className="page-stage-badge">Etapa: {stage}</span> : null}
    </header>
  );
}
