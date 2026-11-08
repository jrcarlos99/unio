package br.com.unio.matchmaking_backend.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.profile.dto.InvestorCreateRequest;
import br.com.unio.matchmaking_backend.profile.dto.StartupCreateRequest;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.profile.service.ProfileService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Criação de perfil depois da D029 (capital e tickets opcionais) e da D030 (perfilRisco
 * com padrão). A validação declarativa (@Positive) é coberta em ProfileControllerTest.
 */
class ProfileServiceTest {

    private static final long STARTUP_ID = 1L;
    private static final long INVESTOR_ID = 2L;

    private UserRepository userRepository;
    private StartupRepository startupRepository;
    private InvestorRepository investorRepository;
    private ProfileService service;

    private final AtomicReference<Startup> startupSalva = new AtomicReference<>();
    private final AtomicReference<Investor> investorSalvo = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        startupRepository = mock(StartupRepository.class);
        investorRepository = mock(InvestorRepository.class);
        service = new ProfileService(userRepository, startupRepository, investorRepository);

        when(userRepository.findById(STARTUP_ID)).thenReturn(Optional.of(user(STARTUP_ID, Role.STARTUP)));
        when(userRepository.findById(INVESTOR_ID)).thenReturn(Optional.of(user(INVESTOR_ID, Role.INVESTOR)));

        when(startupRepository.save(any(Startup.class))).thenAnswer(inv -> {
            startupSalva.set(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(startupRepository.findById(STARTUP_ID)).thenAnswer(inv -> Optional.ofNullable(startupSalva.get()));

        when(investorRepository.save(any(Investor.class))).thenAnswer(inv -> {
            investorSalvo.set(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(investorRepository.findById(INVESTOR_ID)).thenAnswer(inv -> Optional.ofNullable(investorSalvo.get()));
    }

    @Test
    void startupSemCapitalProcuradoECriadaComCapitalNulo() {
        StartupCreateRequest request = startupRequest().capitalProcurado(null).build();

        Map<String, Object> response = service.createStartupProfile(authUser(STARTUP_ID, Role.STARTUP), request);

        assertThat(startupSalva.get().getCapitalProcurado()).isNull();
        assertThat(response).containsEntry("nome", "EcoTech").containsEntry("capitalProcurado", null);
    }

    @Test
    void investidorSemTicketsECriadoComTicketsNulos() {
        InvestorCreateRequest request = investorRequest().ticketMinimo(null).ticketMaximo(null).build();

        Map<String, Object> response = service.createInvestorProfile(authUser(INVESTOR_ID, Role.INVESTOR), request);

        assertThat(investorSalvo.get().getTicketMinimo()).isNull();
        assertThat(investorSalvo.get().getTicketMaximo()).isNull();
        assertThat(response).containsEntry("ticketMinimo", null).containsEntry("ticketMaximo", null);
    }

    @Test
    void investidorComApenasUmTicketPreenchidoEAceito() {
        InvestorCreateRequest request = investorRequest().ticketMinimo(null).ticketMaximo(new BigDecimal("50000")).build();

        service.createInvestorProfile(authUser(INVESTOR_ID, Role.INVESTOR), request);

        assertThat(investorSalvo.get().getTicketMinimo()).isNull();
        assertThat(investorSalvo.get().getTicketMaximo()).isEqualByComparingTo("50000");
    }

    @Test
    void investidorComTicketMinimoMaiorQueMaximoContinua400() {
        InvestorCreateRequest request = investorRequest()
                .ticketMinimo(new BigDecimal("500000"))
                .ticketMaximo(new BigDecimal("50000"))
                .build();

        assertThatThrownBy(() -> service.createInvestorProfile(authUser(INVESTOR_ID, Role.INVESTOR), request))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(investorRepository, never()).save(any());
    }

    @Test
    void investidorSemPerfilRiscoRecebeOPadrao() {
        service.createInvestorProfile(authUser(INVESTOR_ID, Role.INVESTOR),
                investorRequest().perfilRisco(null).build());
        assertThat(investorSalvo.get().getPerfilRisco()).isEqualTo("Investidor Anjo");
    }

    @Test
    void investidorComPerfilRiscoEmBrancoRecebeOPadrao() {
        service.createInvestorProfile(authUser(INVESTOR_ID, Role.INVESTOR),
                investorRequest().perfilRisco("   ").build());
        assertThat(investorSalvo.get().getPerfilRisco()).isEqualTo("Investidor Anjo");
    }

    @Test
    void investidorComPerfilRiscoInformadoMantemOValor() {
        service.createInvestorProfile(authUser(INVESTOR_ID, Role.INVESTOR),
                investorRequest().perfilRisco("Mentor").build());
        assertThat(investorSalvo.get().getPerfilRisco()).isEqualTo("Mentor");
    }

    private StartupCreateRequest.StartupCreateRequestBuilder startupRequest() {
        return StartupCreateRequest.builder()
                .nome("EcoTech")
                .segmento("Fintech")
                .estagio("MVP")
                .localizacao("Recife / Porto Digital")
                .modeloNegocio("B2B")
                .mercadoAlvo("PMEs")
                .capitalProcurado(new BigDecimal("125000"));
    }

    private InvestorCreateRequest.InvestorCreateRequestBuilder investorRequest() {
        return InvestorCreateRequest.builder()
                .segmentosInteresse(List.of("Fintech", "EdTech", "AgTech"))
                .estagiosInteresse(List.of("MVP"))
                .ticketMinimo(new BigDecimal("50000"))
                .ticketMaximo(new BigDecimal("200000"))
                .regiaoInteresse("Recife / Porto Digital,Nordeste")
                .perfilRisco("Investidor Anjo");
    }

    private User user(long id, Role role) {
        return User.builder().id(id).email("perfil-" + id + "@teste.unio").passwordHash("n/a").role(role).build();
    }

    private AuthUser authUser(long id, Role role) {
        AuthUser authUser = mock(AuthUser.class);
        when(authUser.getId()).thenReturn(id);
        when(authUser.getRole()).thenReturn(role);
        return authUser;
    }
}
