package br.com.unio.matchmaking_backend.scorecard.calculation.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * D047: comparação de região do critério REGIAO_FIT.
 *
 * <p>Antes era texto exato entre a localização da startup ("Recife, PE") e cada
 * região do investidor ("Recife / Porto Digital", "Nordeste"), e quase nunca
 * acertava. Agora, sem acentos e sem diferença de maiúsculas, há acerto quando:
 * <ul>
 *   <li>os textos são iguais (regra antiga);</li>
 *   <li>a cidade da startup aparece como palavra em alguma região do investidor;</li>
 *   <li>a UF da startup aparece como palavra em alguma região do investidor, ou a
 *       região é o nome do estado ("Pernambuco" para PE);</li>
 *   <li>a região do investidor menciona "Nordeste" e a UF da startup é do Nordeste;</li>
 *   <li>a região do investidor menciona "Brasil" ("Todo o Brasil").</li>
 * </ul>
 * As regiões do investidor podem vir separadas por vírgula, como os outros campos
 * em CSV do perfil.
 */
public final class RegionMatcher {

    static final Set<String> UFS = Set.of(
            "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa",
            "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to");

    static final Set<String> UFS_NORDESTE = Set.of("al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se");

    /** Nome do estado (sem acento, minúsculo) para a UF, para regiões como "Pernambuco". */
    static final Map<String, String> STATE_NAMES = Map.ofEntries(
            Map.entry("acre", "ac"), Map.entry("alagoas", "al"), Map.entry("amapa", "ap"),
            Map.entry("amazonas", "am"), Map.entry("bahia", "ba"), Map.entry("ceara", "ce"),
            Map.entry("distrito federal", "df"), Map.entry("espirito santo", "es"), Map.entry("goias", "go"),
            Map.entry("maranhao", "ma"), Map.entry("mato grosso", "mt"), Map.entry("mato grosso do sul", "ms"),
            Map.entry("minas gerais", "mg"), Map.entry("para", "pa"), Map.entry("paraiba", "pb"),
            Map.entry("parana", "pr"), Map.entry("pernambuco", "pe"), Map.entry("piaui", "pi"),
            Map.entry("rio de janeiro", "rj"), Map.entry("rio grande do norte", "rn"),
            Map.entry("rio grande do sul", "rs"), Map.entry("rondonia", "ro"), Map.entry("roraima", "rr"),
            Map.entry("santa catarina", "sc"), Map.entry("sao paulo", "sp"), Map.entry("sergipe", "se"),
            Map.entry("tocantins", "to"));

    /** Cidades usadas pelo cadastro que não informam explicitamente a UF. */
    static final Map<String, String> CITY_UFS = Map.ofEntries(
            Map.entry("recife", "pe"),
            Map.entry("natal", "rn"),
            Map.entry("joao pessoa", "pb"),
            Map.entry("maceio", "al"),
            Map.entry("aracaju", "se"),
            Map.entry("salvador", "ba"),
            Map.entry("fortaleza", "ce"),
            Map.entry("sao luis", "ma"),
            Map.entry("teresina", "pi"),
            Map.entry("belo horizonte", "mg"),
            Map.entry("sao paulo", "sp"),
            Map.entry("rio de janeiro", "rj"),
            Map.entry("curitiba", "pr"),
            Map.entry("porto alegre", "rs"),
            Map.entry("florianopolis", "sc"),
            Map.entry("brasilia", "df"));

    private RegionMatcher() {
    }

    public static boolean matches(String startupLocation, String investorRegionsCsv) {
        if (startupLocation == null || startupLocation.isBlank()
                || investorRegionsCsv == null || investorRegionsCsv.isBlank()) {
            return false;
        }
        String location = normalize(startupLocation);
        Place place = parse(location);

        for (String rawRegion : investorRegionsCsv.split(",")) {
            String region = normalize(rawRegion);
            if (region.isEmpty()) {
                continue;
            }
            if (region.equals(location)) {
                return true;
            }
            List<String> words = words(region);
            // "Todo o Brasil": qualquer localização serve
            if (words.contains("brasil")) {
                return true;
            }
            if (place.city() != null && containsPhrase(words, words(place.city()))) {
                return true;
            }
            if (place.uf() != null) {
                if (words.contains(place.uf())) {
                    return true;
                }
                // Nome do estado inteiro na região ("Pernambuco" para PE)
                if (place.uf().equals(STATE_NAMES.get(String.join(" ", words)))) {
                    return true;
                }
                if (words.contains("nordeste") && UFS_NORDESTE.contains(place.uf())) {
                    return true;
                }
            }
        }
        return false;
    }

    /** "recife, pe" / "recife - pe" / "recife/pe" / "recife" → cidade e UF (quando houver). */
    static Place parse(String normalizedLocation) {
        List<String> words = words(normalizedLocation);
        if (words.isEmpty()) {
            return new Place(null, null);
        }
        String last = words.get(words.size() - 1);
        if (words.size() > 1 && UFS.contains(last)) {
            String city = String.join(" ", words.subList(0, words.size() - 1));
            return new Place(city, last);
        }
        if (words.size() == 1 && UFS.contains(last)) {
            return new Place(null, last);
        }
        String city = String.join(" ", words);
        return new Place(city, CITY_UFS.get(city));
    }

    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private static List<String> words(String normalized) {
        return Arrays.stream(normalized.split("[^a-z0-9]+"))
                .filter(word -> !word.isEmpty())
                .toList();
    }

    /** A sequência de palavras {@code phrase} aparece, contígua, em {@code words}. */
    private static boolean containsPhrase(List<String> words, List<String> phrase) {
        if (phrase.isEmpty() || phrase.size() > words.size()) {
            return false;
        }
        for (int start = 0; start + phrase.size() <= words.size(); start++) {
            if (words.subList(start, start + phrase.size()).equals(phrase)) {
                return true;
            }
        }
        return false;
    }

    record Place(String city, String uf) {
    }
}
