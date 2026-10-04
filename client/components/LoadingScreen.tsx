import "./LoadingScreen.css";

interface Props {
  text: string;
  visible: boolean;
}

export default function LoadingScreen({ text, visible }: Props) {
  return (
    <div className={`loading-screen ${visible ? "" : "loading-screen--hidden"}`}>
      <div>
        <div className="pig-nose" />
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
}
