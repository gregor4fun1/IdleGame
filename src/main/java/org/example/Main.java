package org.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

public class Main {

    record Benutzer(int benutzerId, String rolle, String vorname, String nachname,
                    String email, String telefonnummer, String passwortHash, String registriertAm) {}

    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        List<Benutzer> benutzer = List.of(mapper.readValue(Main.class.getResourceAsStream("/data.json"), Benutzer[].class));

        // Gesamtes JSON formatiert ausgeben
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(benutzer));

        // Jeden Nutzer einzeln ausgeben
        for (Benutzer b : benutzer) {
            System.out.printf("#%d %s %s (%s) – %s, %s, registriert am %s%n",
                    b.benutzerId(), b.vorname(), b.nachname(), b.rolle(),
                    b.email(), b.telefonnummer(), b.registriertAm());
        }
    }
}
// Angie war da
//Hallo Gregor Hallo Funda <3
//was süsses
