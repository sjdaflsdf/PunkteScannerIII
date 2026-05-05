import { useParams } from "react-router-dom";
import ScanUpload from "../components/ScanUpload";

export default function PruefungDetail() {
    const { id } = useParams();

    const handleErgebnis = (ergebnis) => {
        console.log("Ergebnis:", ergebnis);
    };

    return (
        <div>
            <h1>Prüfung Details</h1>
            <ScanUpload
                pruefungId={id}
                onErgebnis={handleErgebnis}
            />
        </div>
    );
}