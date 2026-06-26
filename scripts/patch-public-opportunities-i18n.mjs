import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")

const privacyEs = {
  title: "AVISO DE PRIVACIDAD Y PROTECCIÓN DE DATOS PERSONALES",
  decline: "No, gracias",
  accept: "Acepto",
  intro:
    "Sus datos personales serán incorporados a la base de datos de Visible Outsource y procesados exclusivamente por profesionales autorizados del área de Recursos Humanos en el contexto de procesos de selección y gestión de personal.",
  dataTreatmentHeading: "Tratamiento de datos:",
  purposeItem:
    "Finalidad: Evaluación de candidatos y gestión de procesos de reclutamiento",
  accessItem: "Acceso: Personal autorizado de RRHH únicamente",
  confidentialityItem:
    "Confidencialidad: Sus datos serán tratados bajo estrictos estándares de confidencialidad y seguridad de información",
  rightsItem:
    "Derechos: Usted tiene derecho a acceder, rectificar o solicitar la eliminación de sus datos personales",
  compliance:
    "Este sistema cumple con la normativa vigente de protección de datos personales.",
  contactPrefix:
    "Si desea eliminar o rectificar sus datos personales en nuestra base de datos, favor escriba a",
}

const translations = {
  en: {
    page: {
      portalTitle: "Opportunities portal",
      heroTitle: "Find opportunities with a clear view from the first glance",
      heroBody:
        "Browse public vacancies with filters by department, work mode, and location.",
      exploreCta: "Explore opportunities",
      explorerLabel: "Public exploration",
      listTitle: "Available opportunities",
      searchLabel: "Search vacancies",
      searchPlaceholder: "Search vacancies by name",
      filterDepartment: "Department",
      filterModality: "Work mode",
      filterCountry: "Country",
      preparingList: "Preparing the list with active search and filters.",
      tableDepartment: "Department",
      tableLocation: "Location",
      tableAction: "Action",
      viewDetail: "View details",
      vacancy: "Vacancy",
      retry: "Try again",
      emptyTitle: "No vacancies found with those filters.",
      emptyBody:
        "Try adjusting the filters or view all available opportunities again.",
      viewAll: "View all vacancies",
      pageSummary: "Page {page} of {total}",
      prev: "Previous",
      next: "Next",
      loadFailed: "Could not load opportunities.",
      opportunityCount:
        "{count, plural, one {# opportunity} other {# opportunities}}",
      fallbackDepartment: "Department not specified",
      fallbackModality: "Work mode not specified",
      fallbackLocation: "Location not specified",
      companyLogoAlt: "{company} logo",
      companyLogoGeneric: "Company logo",
      resultsShowing: "Showing {from}-{to} of {total}",
      resultsFilterQuote: 'for "{query}"',
      resultsPage: "on page {page}",
      locationMobileLabel: "Location",
      resultsFilterDepartment: "in department {department}",
      resultsFilterModality: "with work mode {modality}",
      resultsFilterCountry: "in {country}",
      activeProcessesSubtitle: "Currently active processes",
    },
    detail: {
      notFound: "We could not find the requested vacancy.",
      loadFailed: "Could not load the vacancy.",
      viewAll: "View all opportunities",
      back: "Back to opportunities",
      apply: "Apply",
      activeBadge: "Active vacancy",
      unspecified: "Not specified",
      published: "Published {date}",
      keyBlock: "Key block",
      roleContext: "Role context",
      jobDescription: "Job description",
      moreAboutRole: "More about the role",
      additionalDetails: "Additional details",
      whatWeOffer: "What we offer",
      benefits: "Benefits",
      responsibilities: "Responsibilities",
      requirements: "Requirements",
      sidebarTitle: "Vacancy details",
      company: "Company",
      department: "Department",
      modality: "Work mode",
      location: "Location",
      salary: "Salary",
      publishedLabel: "Published",
    },
    applicationForm: {
      sources: {
        social: "Social media",
        friends: "Friends",
        jobFair: "Job fair",
        other: "Other",
      },
      steps: {
        creation: "Creation",
        analysis: "Analysis",
        application: "Application",
        saved: "Saved",
        success: "Success",
        ready: "Ready",
        processingTitle: "Processing your application",
        processingHint:
          "We are validating your data and preparing the submission. This may take a few seconds.",
        processingLongWait:
          "If the wait takes longer, do not close this window. We are still processing your application.",
      },
      validation: {
        fileType: "Only PDF or DOCX files are accepted.",
        firstNameRequired: "Enter your first name.",
        lastNameRequired: "Enter your last name.",
        emailRequired: "Enter your email.",
        emailInvalid: "Enter a valid email.",
        cvRequired: "Attach your CV in PDF or DOCX.",
        reviewFields: "Review the indicated fields.",
        documentTypeRequiresNumber:
          "If you select a document type, you must enter the number.",
        documentNumberRequiresType:
          "If you enter a document number, you must select the type.",
      },
      fields: {
        firstName: "First name *",
        lastName: "Last name *",
        email: "Email *",
        phone: "Phone",
        documentType: "Document type",
        documentNumber: "Document number",
        source: "How did you hear about this vacancy?",
        linkedin: "LinkedIn profile",
        website: "Website or portfolio",
        notes: "Notes",
        resume: "Resume (PDF) *",
      },
      placeholders: {
        loadingDocTypes: "Loading document types...",
        noDocTypes: "No types available",
        selectDocType: "Select a type",
        selectOption: "Select an option",
        documentNumber: "Enter your document number",
      },
      file: {
        selectPdf: "Select PDF",
        helper: "Only PDF or DOCX format is accepted.",
      },
      actions: {
        submitting: "Submitting application…",
        submit: "Submit application",
        backToVacancy: "Back to vacancy",
        backToList: "Back to vacancies",
        close: "Close",
      },
      aria: { submitStatus: "Submission status" },
      toasts: {
        submitSuccess: "Application submitted",
        submitFailed: "Failed to submit application",
      },
    },
    confirmation: {
      title: "Confirm your contact email",
      closeAria: "Close modal",
      contactEmail: "Contact email:",
      body1: "We will use this email to communicate about your application.",
      body2: "Verify that it is correct before submitting.",
      warning:
        "If the email is invalid, you may not receive updates about the process.",
      cancel: "Cancel",
      confirm: "Confirm and submit application",
    },
    privacy: {
      title: "PRIVACY NOTICE AND PERSONAL DATA PROTECTION",
      decline: "No, thanks",
      accept: "I accept",
      intro:
        "Your personal data will be added to the Visible Outsource database and processed exclusively by authorized Human Resources professionals in the context of recruitment and personnel management processes.",
      dataTreatmentHeading: "Data processing:",
      purposeItem:
        "Purpose: Candidate evaluation and recruitment process management",
      accessItem: "Access: Authorized HR staff only",
      confidentialityItem:
        "Confidentiality: Your data will be handled under strict confidentiality and information security standards",
      rightsItem:
        "Rights: You have the right to access, rectify, or request deletion of your personal data",
      compliance:
        "This system complies with applicable personal data protection regulations.",
      contactPrefix:
        "If you wish to delete or rectify your personal data in our database, please write to",
    },
    actions: { applyToVacancy: "Apply to this vacancy" },
    fallbacks: { unspecified: "Not specified" },
    navbar: {
      ariaMain: "Main opportunities portal navigation",
      ariaGoToPortal: "Go to opportunities portal",
      logoIconAlt: "ATS logo icon",
      portalSubtitle: "Opportunities portal",
      ariaGoToSelection: "Go to portal selection",
      changePortal: "Change portal",
      portalsShort: "Portals",
    },
    tips: {
      title: "Tip for your application",
      tip1: "Make sure your email and phone number are up to date.",
      tip2: "Upload your resume in PDF format.",
      tip3: "Verify that all your information is correct before submitting.",
      tip4: "Make sure you meet the main requirements of the vacancy.",
      tip5: "Stay alert for emails and calls after applying.",
      tip6: "Use a professional file name for your CV.",
      tip7: "Check the spelling of your information before continuing.",
      tip8: "Attach all requested documents.",
      tip9: "Do not forget to include your most recent work experience.",
      tip10: "Confirm that your availability matches what is requested in the vacancy.",
    },
    apply: {
      vacancyNotFound: "We could not find the vacancy for this application.",
      loadFailed: "Could not load the application form.",
      backToDetail: "Back to vacancy details",
      applyBadge: "Apply",
      beforeSubmit: "Before submitting",
      checklistCv: "Have your CV in PDF ready to attach.",
      checklistEmail: "Use the same email associated with your candidate account.",
      checklistData: "Complete first name, last name, and email with real data.",
      formSectionLabel: "Application form",
      formTitle: "Submit your application",
      formBody:
        "Complete the information and attach your CV. The data is sent securely to the recruitment team.",
      documentTitle: "ATS | Opportunities | Apply to {title}",
    },
  },
  de: {
    page: {
      portalTitle: "Stellenportal",
      heroTitle:
        "Finden Sie Stellenangebote mit klarer Übersicht auf einen Blick",
      heroBody:
        "Durchsuchen Sie öffentliche Stellen mit Filtern nach Abteilung, Arbeitsmodell und Standort.",
      exploreCta: "Stellen erkunden",
      explorerLabel: "Öffentliche Suche",
      listTitle: "Verfügbare Stellen",
      searchLabel: "Stellen suchen",
      searchPlaceholder: "Stellen nach Namen suchen",
      filterDepartment: "Abteilung",
      filterModality: "Arbeitsmodell",
      filterCountry: "Land",
      preparingList:
        "Die Liste wird mit aktiver Suche und Filtern vorbereitet.",
      tableDepartment: "Abteilung",
      tableLocation: "Standort",
      tableAction: "Aktion",
      viewDetail: "Details ansehen",
      vacancy: "Stelle",
      retry: "Erneut versuchen",
      emptyTitle: "Keine Stellen mit diesen Filtern gefunden.",
      emptyBody:
        "Passen Sie die Filter an oder sehen Sie sich alle verfügbaren Stellen erneut an.",
      viewAll: "Alle Stellen anzeigen",
      pageSummary: "Seite {page} von {total}",
      prev: "Zurück",
      next: "Weiter",
      loadFailed: "Stellen konnten nicht geladen werden.",
      opportunityCount:
        "{count, plural, one {# Stelle} other {# Stellen}}",
      fallbackDepartment: "Abteilung nicht angegeben",
      fallbackModality: "Arbeitsmodell nicht angegeben",
      fallbackLocation: "Standort nicht angegeben",
      companyLogoAlt: "Logo von {company}",
      companyLogoGeneric: "Firmenlogo",
      resultsShowing: "Anzeige {from}-{to} von {total}",
      resultsFilterQuote: 'für "{query}"',
      resultsPage: "auf Seite {page}",
      locationMobileLabel: "Standort",
      resultsFilterDepartment: "in der Abteilung {department}",
      resultsFilterModality: "mit Arbeitsmodell {modality}",
      resultsFilterCountry: "in {country}",
      activeProcessesSubtitle: "Derzeit aktive Prozesse",
    },
    detail: {
      notFound: "Die angeforderte Stelle wurde nicht gefunden.",
      loadFailed: "Die Stelle konnte nicht geladen werden.",
      viewAll: "Alle Stellen anzeigen",
      back: "Zurück zu Stellen",
      apply: "Bewerben",
      activeBadge: "Aktive Stelle",
      unspecified: "Nicht angegeben",
      published: "Veröffentlicht {date}",
      keyBlock: "Schlüsselblock",
      roleContext: "Rollenkontext",
      jobDescription: "Stellenbeschreibung",
      moreAboutRole: "Mehr über die Rolle",
      additionalDetails: "Zusätzliche Details",
      whatWeOffer: "Was wir bieten",
      benefits: "Vorteile und Benefits",
      responsibilities: "Verantwortlichkeiten",
      requirements: "Anforderungen",
      sidebarTitle: "Stellendetails",
      company: "Unternehmen",
      department: "Abteilung",
      modality: "Arbeitsmodell",
      location: "Standort",
      salary: "Gehalt",
      publishedLabel: "Veröffentlichung",
    },
    applicationForm: {
      sources: {
        social: "Soziale Medien",
        friends: "Freunde",
        jobFair: "Jobmesse",
        other: "Sonstiges",
      },
      steps: {
        creation: "Erstellung",
        analysis: "Analyse",
        application: "Bewerbung",
        saved: "Gespeichert",
        success: "Erfolg",
        ready: "Bereit",
        processingTitle: "Ihre Bewerbung wird verarbeitet",
        processingHint:
          "Wir validieren Ihre Daten und bereiten den Versand vor. Dies kann einige Sekunden dauern.",
        processingLongWait:
          "Wenn die Wartezeit länger dauert, schließen Sie dieses Fenster nicht. Wir verarbeiten Ihre Bewerbung weiter.",
      },
      validation: {
        fileType: "Es werden nur PDF- oder DOCX-Dateien akzeptiert.",
        firstNameRequired: "Geben Sie Ihren Vornamen ein.",
        lastNameRequired: "Geben Sie Ihren Nachnamen ein.",
        emailRequired: "Geben Sie Ihre E-Mail ein.",
        emailInvalid: "Geben Sie eine gültige E-Mail ein.",
        cvRequired: "Fügen Sie Ihren Lebenslauf als PDF oder DOCX bei.",
        reviewFields: "Überprüfen Sie die angegebenen Felder.",
        documentTypeRequiresNumber:
          "Wenn Sie einen Dokumenttyp wählen, müssen Sie die Nummer eingeben.",
        documentNumberRequiresType:
          "Wenn Sie eine Dokumentnummer eingeben, müssen Sie den Typ wählen.",
      },
      fields: {
        firstName: "Vorname *",
        lastName: "Nachname *",
        email: "E-Mail *",
        phone: "Telefon",
        documentType: "Dokumenttyp",
        documentNumber: "Dokumentnummer",
        source: "Wie haben Sie von dieser Stelle erfahren?",
        linkedin: "LinkedIn-Profil",
        website: "Website oder Portfolio",
        notes: "Notizen",
        resume: "Lebenslauf (PDF) *",
      },
      placeholders: {
        loadingDocTypes: "Dokumenttypen werden geladen...",
        noDocTypes: "Keine Typen verfügbar",
        selectDocType: "Typ auswählen",
        selectOption: "Option auswählen",
        documentNumber: "Dokumentnummer eingeben",
      },
      file: {
        selectPdf: "PDF auswählen",
        helper: "Es wird nur PDF- oder DOCX-Format akzeptiert.",
      },
      actions: {
        submitting: "Bewerbung wird gesendet…",
        submit: "Bewerbung senden",
        backToVacancy: "Zurück zur Stelle",
        backToList: "Zurück zu Stellen",
        close: "Schließen",
      },
      aria: { submitStatus: "Sendestatus" },
      toasts: {
        submitSuccess: "Bewerbung gesendet",
        submitFailed: "Fehler beim Senden der Bewerbung",
      },
    },
    confirmation: {
      title: "Bestätigen Sie Ihre Kontakt-E-Mail",
      closeAria: "Modal schließen",
      contactEmail: "Kontakt-E-Mail:",
      body1:
        "Wir verwenden diese E-Mail, um Sie über Ihre Bewerbung zu informieren.",
      body2: "Überprüfen Sie, ob sie korrekt ist, bevor Sie senden.",
      warning:
        "Wenn die E-Mail ungültig ist, erhalten Sie möglicherweise keine Updates zum Prozess.",
      cancel: "Abbrechen",
      confirm: "Bestätigen und Bewerbung senden",
    },
    privacy: {
      title: "DATENSCHUTZHINWEIS UND SCHUTZ PERSONENBEZOGENER DATEN",
      decline: "Nein, danke",
      accept: "Ich akzeptiere",
      intro:
        "Ihre personenbezogenen Daten werden in die Datenbank von Visible Outsource aufgenommen und ausschließlich von autorisierten Fachkräften der Personalabteilung im Rahmen von Auswahl- und Personalmanagementprozessen verarbeitet.",
      dataTreatmentHeading: "Datenverarbeitung:",
      purposeItem:
        "Zweck: Bewertung von Kandidaten und Verwaltung von Rekrutierungsprozessen",
      accessItem: "Zugriff: Nur autorisiertes HR-Personal",
      confidentialityItem:
        "Vertraulichkeit: Ihre Daten werden nach strengen Vertraulichkeits- und Informationssicherheitsstandards behandelt",
      rightsItem:
        "Rechte: Sie haben das Recht auf Zugang, Berichtigung oder Löschung Ihrer personenbezogenen Daten",
      compliance:
        "Dieses System entspricht den geltenden Vorschriften zum Schutz personenbezogener Daten.",
      contactPrefix:
        "Wenn Sie Ihre personenbezogenen Daten in unserer Datenbank löschen oder berichtigen möchten, schreiben Sie bitte an",
    },
    actions: { applyToVacancy: "Auf diese Stelle bewerben" },
    fallbacks: { unspecified: "Nicht angegeben" },
    navbar: {
      ariaMain: "Hauptnavigation des Stellenportals",
      ariaGoToPortal: "Zum Stellenportal",
      logoIconAlt: "ATS-Logo-Symbol",
      portalSubtitle: "Stellenportal",
      ariaGoToSelection: "Zur Portal-Auswahl",
      changePortal: "Portal wechseln",
      portalsShort: "Portale",
    },
    tips: {
      title: "Tipp für Ihre Bewerbung",
      tip1: "Stellen Sie sicher, dass E-Mail und Telefonnummer aktuell sind.",
      tip2: "Laden Sie Ihren Lebenslauf im PDF-Format hoch.",
      tip3:
        "Überprüfen Sie, dass alle Ihre Angaben korrekt sind, bevor Sie senden.",
      tip4:
        "Stellen Sie sicher, dass Sie die wichtigsten Anforderungen der Stelle erfüllen.",
      tip5:
        "Achten Sie nach der Bewerbung auf E-Mails und Anrufe.",
      tip6: "Verwenden Sie einen professionellen Dateinamen für Ihren Lebenslauf.",
      tip7:
        "Überprüfen Sie die Rechtschreibung Ihrer Angaben, bevor Sie fortfahren.",
      tip8: "Fügen Sie alle angeforderten Dokumente bei.",
      tip9: "Vergessen Sie nicht, Ihre jüngste Berufserfahrung anzugeben.",
      tip10:
        "Bestätigen Sie, dass Ihre Verfügbarkeit den Anforderungen der Stelle entspricht.",
    },
    apply: {
      vacancyNotFound:
        "Wir konnten die Stelle für diese Bewerbung nicht finden.",
      loadFailed: "Das Bewerbungsformular konnte nicht geladen werden.",
      backToDetail: "Zurück zu den Stellendetails",
      applyBadge: "Bewerben",
      beforeSubmit: "Vor dem Absenden",
      checklistCv: "Halten Sie Ihren Lebenslauf als PDF zum Anhängen bereit.",
      checklistEmail:
        "Verwenden Sie dieselbe E-Mail wie bei Ihrem Kandidatenkonto.",
      checklistData:
        "Geben Sie Vorname, Nachname und E-Mail mit echten Daten an.",
      formSectionLabel: "Bewerbungsformular",
      formTitle: "Bewerbung senden",
      formBody:
        "Füllen Sie die Daten aus und hängen Sie Ihren Lebenslauf an. Die Informationen werden sicher an das Recruiting-Team gesendet.",
      documentTitle: "ATS | Stellen | Bewerbung für {title}",
    },
  },
  fr: {
    page: {
      portalTitle: "Portail des opportunités",
      heroTitle:
        "Trouvez des opportunités avec une lecture claire dès le premier regard",
      heroBody:
        "Parcourez les offres publiques avec des filtres par département, modalité et localisation.",
      exploreCta: "Explorer les opportunités",
      explorerLabel: "Exploration publique",
      listTitle: "Opportunités disponibles",
      searchLabel: "Rechercher des offres",
      searchPlaceholder: "Rechercher des offres par nom",
      filterDepartment: "Département",
      filterModality: "Modalité",
      filterCountry: "Pays",
      preparingList:
        "Préparation de la liste avec la recherche et les filtres actifs.",
      tableDepartment: "Département",
      tableLocation: "Localisation",
      tableAction: "Action",
      viewDetail: "Voir le détail",
      vacancy: "Offre",
      retry: "Réessayer",
      emptyTitle: "Aucune offre trouvée avec ces filtres.",
      emptyBody:
        "Essayez d'ajuster les filtres ou consultez à nouveau toutes les opportunités disponibles.",
      viewAll: "Voir toutes les offres",
      pageSummary: "Page {page} sur {total}",
      prev: "Précédent",
      next: "Suivant",
      loadFailed: "Impossible de charger les opportunités.",
      opportunityCount:
        "{count, plural, one {# opportunité} other {# opportunités}}",
      fallbackDepartment: "Département non spécifié",
      fallbackModality: "Modalité non spécifiée",
      fallbackLocation: "Localisation non spécifiée",
      companyLogoAlt: "Logo de {company}",
      companyLogoGeneric: "Logo de l'entreprise",
      resultsShowing: "Affichage {from}-{to} sur {total}",
      resultsFilterQuote: 'pour « {query} »',
      resultsPage: "à la page {page}",
      locationMobileLabel: "Localisation",
      resultsFilterDepartment: "dans le département {department}",
      resultsFilterModality: "avec la modalité {modality}",
      resultsFilterCountry: "en {country}",
      activeProcessesSubtitle: "Processus actifs actuellement",
    },
    detail: {
      notFound: "Nous n'avons pas trouvé l'offre demandée.",
      loadFailed: "Impossible de charger l'offre.",
      viewAll: "Voir toutes les opportunités",
      back: "Retour aux opportunités",
      apply: "Postuler",
      activeBadge: "Offre active",
      unspecified: "Non spécifié",
      published: "Publiée le {date}",
      keyBlock: "Bloc clé",
      roleContext: "Contexte du rôle",
      jobDescription: "Description du poste",
      moreAboutRole: "En savoir plus sur le poste",
      additionalDetails: "Détails supplémentaires",
      whatWeOffer: "Ce que nous offrons",
      benefits: "Avantages et bénéfices",
      responsibilities: "Responsabilités",
      requirements: "Exigences",
      sidebarTitle: "Détails de l'offre",
      company: "Entreprise",
      department: "Département",
      modality: "Modalité",
      location: "Localisation",
      salary: "Salaire",
      publishedLabel: "Publication",
    },
    applicationForm: {
      sources: {
        social: "Réseaux sociaux",
        friends: "Amis",
        jobFair: "Salon de l'emploi",
        other: "Autres",
      },
      steps: {
        creation: "Création",
        analysis: "Analyse",
        application: "Candidature",
        saved: "Enregistré",
        success: "Succès",
        ready: "Prêt",
        processingTitle: "Traitement de votre candidature",
        processingHint:
          "Nous validons vos données et préparons l'envoi. Cela peut prendre quelques secondes.",
        processingLongWait:
          "Si l'attente se prolonge, ne fermez pas cette fenêtre. Nous traitons toujours votre candidature.",
      },
      validation: {
        fileType: "Seuls les fichiers PDF ou DOCX sont acceptés.",
        firstNameRequired: "Saisissez votre prénom.",
        lastNameRequired: "Saisissez votre nom.",
        emailRequired: "Saisissez votre e-mail.",
        emailInvalid: "Saisissez un e-mail valide.",
        cvRequired: "Joignez votre CV en PDF ou DOCX.",
        reviewFields: "Vérifiez les champs indiqués.",
        documentTypeRequiresNumber:
          "Si vous sélectionnez un type de document, vous devez saisir le numéro.",
        documentNumberRequiresType:
          "Si vous saisissez un numéro de document, vous devez sélectionner le type.",
      },
      fields: {
        firstName: "Prénom *",
        lastName: "Nom *",
        email: "E-mail *",
        phone: "Téléphone",
        documentType: "Type de document",
        documentNumber: "Numéro de document",
        source: "Comment avez-vous connu cette offre ?",
        linkedin: "Profil LinkedIn",
        website: "Site web ou portfolio",
        notes: "Notes",
        resume: "CV (PDF) *",
      },
      placeholders: {
        loadingDocTypes: "Chargement des types de document...",
        noDocTypes: "Aucun type disponible",
        selectDocType: "Sélectionnez un type",
        selectOption: "Sélectionnez une option",
        documentNumber: "Saisissez votre numéro de document",
      },
      file: {
        selectPdf: "Sélectionner un PDF",
        helper: "Seuls les formats PDF ou DOCX sont acceptés.",
      },
      actions: {
        submitting: "Envoi de la candidature…",
        submit: "Envoyer la candidature",
        backToVacancy: "Retour à l'offre",
        backToList: "Retour aux offres",
        close: "Fermer",
      },
      aria: { submitStatus: "État de l'envoi" },
      toasts: {
        submitSuccess: "Candidature envoyée",
        submitFailed: "Erreur lors de l'envoi de la candidature",
      },
    },
    confirmation: {
      title: "Confirmez votre e-mail de contact",
      closeAria: "Fermer la fenêtre",
      contactEmail: "E-mail de contact :",
      body1:
        "Nous utiliserons cet e-mail pour communiquer au sujet de votre candidature.",
      body2: "Vérifiez qu'il est correct avant d'envoyer.",
      warning:
        "Si l'e-mail n'est pas valide, vous pourriez ne pas recevoir de mises à jour sur le processus.",
      cancel: "Annuler",
      confirm: "Confirmer et envoyer la candidature",
    },
    privacy: {
      title: "AVIS DE CONFIDENTIALITÉ ET DE PROTECTION DES DONNÉES PERSONNELLES",
      decline: "Non, merci",
      accept: "J'accepte",
      intro:
        "Vos données personnelles seront intégrées à la base de données de Visible Outsource et traitées exclusivement par des professionnels autorisés du service des Ressources Humaines dans le cadre des processus de sélection et de gestion du personnel.",
      dataTreatmentHeading: "Traitement des données :",
      purposeItem:
        "Finalité : Évaluation des candidats et gestion des processus de recrutement",
      accessItem: "Accès : Personnel RH autorisé uniquement",
      confidentialityItem:
        "Confidentialité : Vos données seront traitées selon des normes strictes de confidentialité et de sécurité de l'information",
      rightsItem:
        "Droits : Vous avez le droit d'accéder, de rectifier ou de demander la suppression de vos données personnelles",
      compliance:
        "Ce système est conforme à la réglementation en vigueur sur la protection des données personnelles.",
      contactPrefix:
        "Si vous souhaitez supprimer ou rectifier vos données personnelles dans notre base de données, veuillez écrire à",
    },
    actions: { applyToVacancy: "Postuler à cette offre" },
    fallbacks: { unspecified: "Non spécifié" },
    navbar: {
      ariaMain: "Navigation principale du portail des opportunités",
      ariaGoToPortal: "Aller au portail des opportunités",
      logoIconAlt: "Icône du logo ATS",
      portalSubtitle: "Portail des opportunités",
      ariaGoToSelection: "Aller à la sélection de portail",
      changePortal: "Changer de portail",
      portalsShort: "Portails",
    },
    tips: {
      title: "Conseil pour votre candidature",
      tip1: "Vérifiez que votre e-mail et votre téléphone sont à jour.",
      tip2: "Téléversez votre CV au format PDF.",
      tip3:
        "Vérifiez que toutes vos informations sont correctes avant d'envoyer.",
      tip4:
        "Assurez-vous de répondre aux principales exigences de l'offre.",
      tip5:
        "Restez attentif à vos e-mails et appels après avoir postulé.",
      tip6: "Utilisez un nom de fichier professionnel pour votre CV.",
      tip7:
        "Vérifiez l'orthographe de vos informations avant de continuer.",
      tip8: "Joignez tous les documents demandés.",
      tip9: "N'oubliez pas d'inclure votre expérience professionnelle la plus récente.",
      tip10:
        "Confirmez que votre disponibilité correspond à ce qui est demandé dans l'offre.",
    },
    apply: {
      vacancyNotFound:
        "Nous n'avons pas trouvé l'offre pour cette candidature.",
      loadFailed: "Impossible de charger le formulaire de candidature.",
      backToDetail: "Retour au détail de l'offre",
      applyBadge: "Postuler",
      beforeSubmit: "Avant d'envoyer",
      checklistCv: "Ayez votre CV en PDF prêt à joindre.",
      checklistEmail:
        "Utilisez le même e-mail associé à votre compte candidat.",
      checklistData:
        "Renseignez prénom, nom et e-mail avec des données réelles.",
      formSectionLabel: "Formulaire de candidature",
      formTitle: "Envoyez votre candidature",
      formBody:
        "Complétez les informations et joignez votre CV. Les données sont envoyées en toute sécurité à l'équipe de recrutement.",
      documentTitle: "ATS | Opportunités | Postuler à {title}",
    },
  },
  it: {
    page: {
      portalTitle: "Portale opportunità",
      heroTitle:
        "Trova opportunità con una lettura chiara fin dal primo sguardo",
      heroBody:
        "Esplora le offerte pubbliche con filtri per dipartimento, modalità e ubicazione.",
      exploreCta: "Esplora opportunità",
      explorerLabel: "Esplorazione pubblica",
      listTitle: "Opportunità disponibili",
      searchLabel: "Cerca offerte",
      searchPlaceholder: "Cerca offerte per nome",
      filterDepartment: "Dipartimento",
      filterModality: "Modalità",
      filterCountry: "Paese",
      preparingList:
        "Preparazione dell'elenco con ricerca e filtri attivi.",
      tableDepartment: "Dipartimento",
      tableLocation: "Ubicazione",
      tableAction: "Azione",
      viewDetail: "Vedi dettaglio",
      vacancy: "Offerta",
      retry: "Riprova",
      emptyTitle: "Nessuna offerta trovata con questi filtri.",
      emptyBody:
        "Prova a modificare i filtri o visualizza di nuovo tutte le opportunità disponibili.",
      viewAll: "Vedi tutte le offerte",
      pageSummary: "Pagina {page} di {total}",
      prev: "Precedente",
      next: "Successivo",
      loadFailed: "Impossibile caricare le opportunità.",
      opportunityCount:
        "{count, plural, one {# opportunità} other {# opportunità}}",
      fallbackDepartment: "Dipartimento non specificato",
      fallbackModality: "Modalità non specificata",
      fallbackLocation: "Ubicazione non specificata",
      companyLogoAlt: "Logo di {company}",
      companyLogoGeneric: "Logo aziendale",
      resultsShowing: "Visualizzazione {from}-{to} di {total}",
      resultsFilterQuote: 'per "{query}"',
      resultsPage: "nella pagina {page}",
      locationMobileLabel: "Ubicazione",
      resultsFilterDepartment: "nel dipartimento {department}",
      resultsFilterModality: "con modalità {modality}",
      resultsFilterCountry: "in {country}",
      activeProcessesSubtitle: "Processi attivi attualmente",
    },
    detail: {
      notFound: "Non abbiamo trovato l'offerta richiesta.",
      loadFailed: "Impossibile caricare l'offerta.",
      viewAll: "Vedi tutte le opportunità",
      back: "Torna alle opportunità",
      apply: "Candidati",
      activeBadge: "Offerta attiva",
      unspecified: "Non specificato",
      published: "Pubblicata {date}",
      keyBlock: "Blocco chiave",
      roleContext: "Contesto del ruolo",
      jobDescription: "Descrizione del lavoro",
      moreAboutRole: "Più sul ruolo",
      additionalDetails: "Dettagli aggiuntivi",
      whatWeOffer: "Cosa offriamo",
      benefits: "Vantaggi e benefit",
      responsibilities: "Responsabilità",
      requirements: "Requisiti",
      sidebarTitle: "Dettagli dell'offerta",
      company: "Azienda",
      department: "Dipartimento",
      modality: "Modalità",
      location: "Ubicazione",
      salary: "Stipendio",
      publishedLabel: "Pubblicazione",
    },
    applicationForm: {
      sources: {
        social: "Social media",
        friends: "Amici",
        jobFair: "Fiera del lavoro",
        other: "Altro",
      },
      steps: {
        creation: "Creazione",
        analysis: "Analisi",
        application: "Candidatura",
        saved: "Salvato",
        success: "Successo",
        ready: "Pronto",
        processingTitle: "Elaborazione della candidatura",
        processingHint:
          "Stiamo convalidando i tuoi dati e preparando l'invio. Potrebbero volerci alcuni secondi.",
        processingLongWait:
          "Se l'attesa si prolunga, non chiudere questa finestra. Stiamo ancora elaborando la tua candidatura.",
      },
      validation: {
        fileType: "Sono accettati solo file PDF o DOCX.",
        firstNameRequired: "Inserisci il tuo nome.",
        lastNameRequired: "Inserisci il tuo cognome.",
        emailRequired: "Inserisci la tua email.",
        emailInvalid: "Inserisci un'email valida.",
        cvRequired: "Allega il tuo CV in PDF o DOCX.",
        reviewFields: "Controlla i campi indicati.",
        documentTypeRequiresNumber:
          "Se selezioni un tipo di documento, devi inserire il numero.",
        documentNumberRequiresType:
          "Se inserisci un numero di documento, devi selezionare il tipo.",
      },
      fields: {
        firstName: "Nome *",
        lastName: "Cognome *",
        email: "Email *",
        phone: "Telefono",
        documentType: "Tipo di documento",
        documentNumber: "Numero di documento",
        source: "Come hai conosciuto questa offerta?",
        linkedin: "Profilo LinkedIn",
        website: "Sito web o portfolio",
        notes: "Note",
        resume: "Curriculum (PDF) *",
      },
      placeholders: {
        loadingDocTypes: "Caricamento tipi di documento...",
        noDocTypes: "Nessun tipo disponibile",
        selectDocType: "Seleziona un tipo",
        selectOption: "Seleziona un'opzione",
        documentNumber: "Inserisci il numero del documento",
      },
      file: {
        selectPdf: "Seleziona PDF",
        helper: "È accettato solo il formato PDF o DOCX.",
      },
      actions: {
        submitting: "Invio candidatura…",
        submit: "Invia candidatura",
        backToVacancy: "Torna all'offerta",
        backToList: "Torna alle offerte",
        close: "Chiudi",
      },
      aria: { submitStatus: "Stato dell'invio" },
      toasts: {
        submitSuccess: "Candidatura inviata",
        submitFailed: "Errore nell'invio della candidatura",
      },
    },
    confirmation: {
      title: "Conferma la tua email di contatto",
      closeAria: "Chiudi finestra",
      contactEmail: "Email di contatto:",
      body1:
        "Useremo questa email per comunicare riguardo alla tua candidatura.",
      body2: "Verifica che sia corretta prima di inviare.",
      warning:
        "Se l'email non è valida, potresti non ricevere aggiornamenti sul processo.",
      cancel: "Annulla",
      confirm: "Conferma e invia candidatura",
    },
    privacy: {
      title: "INFORMATIVA SULLA PRIVACY E PROTEZIONE DEI DATI PERSONALI",
      decline: "No, grazie",
      accept: "Accetto",
      intro:
        "I tuoi dati personali saranno inseriti nel database di Visible Outsource e trattati esclusivamente da professionisti autorizzati dell'area Risorse Umane nel contesto dei processi di selezione e gestione del personale.",
      dataTreatmentHeading: "Trattamento dei dati:",
      purposeItem:
        "Finalità: Valutazione dei candidati e gestione dei processi di reclutamento",
      accessItem: "Accesso: Solo personale HR autorizzato",
      confidentialityItem:
        "Riservatezza: I tuoi dati saranno trattati secondo rigorosi standard di riservatezza e sicurezza delle informazioni",
      rightsItem:
        "Diritti: Hai il diritto di accedere, rettificare o richiedere la cancellazione dei tuoi dati personali",
      compliance:
        "Questo sistema è conforme alla normativa vigente sulla protezione dei dati personali.",
      contactPrefix:
        "Se desideri eliminare o rettificare i tuoi dati personali nel nostro database, scrivi a",
    },
    actions: { applyToVacancy: "Candidati a questa offerta" },
    fallbacks: { unspecified: "Non specificato" },
    navbar: {
      ariaMain: "Navigazione principale del portale opportunità",
      ariaGoToPortal: "Vai al portale opportunità",
      logoIconAlt: "Icona logo ATS",
      portalSubtitle: "Portale opportunità",
      ariaGoToSelection: "Vai alla selezione del portale",
      changePortal: "Cambia portale",
      portalsShort: "Portali",
    },
    tips: {
      title: "Suggerimento per la tua candidatura",
      tip1: "Verifica che email e telefono siano aggiornati.",
      tip2: "Carica il tuo curriculum in formato PDF.",
      tip3:
        "Verifica che tutti i tuoi dati siano corretti prima di inviare.",
      tip4:
        "Assicurati di soddisfare i requisiti principali dell'offerta.",
      tip5:
        "Resta attento a email e telefonate dopo aver inviato la candidatura.",
      tip6: "Usa un nome file professionale per il tuo CV.",
      tip7:
        "Controlla l'ortografia delle tue informazioni prima di continuare.",
      tip8: "Allega tutti i documenti richiesti.",
      tip9: "Non dimenticare di includere la tua esperienza lavorativa più recente.",
      tip10:
        "Conferma che la tua disponibilità corrisponda a quanto richiesto nell'offerta.",
    },
    apply: {
      vacancyNotFound:
        "Non abbiamo trovato l'offerta per questa candidatura.",
      loadFailed: "Impossibile caricare il modulo di candidatura.",
      backToDetail: "Torna al dettaglio dell'offerta",
      applyBadge: "Candidati",
      beforeSubmit: "Prima di inviare",
      checklistCv: "Tieni pronto il tuo CV in PDF da allegare.",
      checklistEmail:
        "Usa la stessa email associata al tuo account candidato.",
      checklistData:
        "Completa nome, cognome ed email con dati reali.",
      formSectionLabel: "Modulo di candidatura",
      formTitle: "Invia la tua candidatura",
      formBody:
        "Completa i dati e allega il tuo CV. Le informazioni vengono inviate in modo sicuro al team di recruiting.",
      documentTitle: "ATS | Opportunità | Candidati a {title}",
    },
  },
}

for (const locale of ["en", "de", "fr", "it"]) {
  const filePath = join(root, "messages", `${locale}.json`)
  const data = JSON.parse(readFileSync(filePath, "utf8"))
  data.PublicOpportunities = translations[locale]
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

const esPath = join(root, "messages", "es.json")
const esData = JSON.parse(readFileSync(esPath, "utf8"))
esData.PublicOpportunities.privacy = privacyEs
writeFileSync(esPath, `${JSON.stringify(esData, null, 2)}\n`)

console.log("Patched PublicOpportunities in en, de, fr, it and privacy in es")
