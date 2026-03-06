export type Language = 'fr' | 'en';

export const translations = {
  // Navigation & Layout
  'nav.dashboard': { fr: 'Tableau de bord', en: 'Dashboard' },
  'nav.tenants': { fr: 'Organisations', en: 'Tenants' },
  'nav.users': { fr: 'Utilisateurs', en: 'Users' },
  'nav.schedules': { fr: 'Horaires', en: 'Schedules' },
  'nav.settings': { fr: 'Paramètres', en: 'Settings' },
  'nav.invitations': { fr: 'Invitations', en: 'Invitations' },
  'nav.team': { fr: 'Équipe', en: 'Team' },
  'nav.contracts': { fr: 'Contrats', en: 'Contracts' },
  'nav.my_schedule': { fr: 'Mon horaire', en: 'My Schedule' },
  'nav.logout': { fr: 'Déconnexion', en: 'Logout' },

  // Auth
  'auth.login': { fr: 'Connexion', en: 'Login' },
  'auth.register': { fr: 'Inscription', en: 'Register' },
  'auth.email': { fr: 'Adresse courriel', en: 'Email address' },
  'auth.password': { fr: 'Mot de passe', en: 'Password' },
  'auth.confirm_password': { fr: 'Confirmer le mot de passe', en: 'Confirm password' },
  'auth.full_name': { fr: 'Nom complet', en: 'Full name' },
  'auth.org_name': { fr: "Nom de l'organisation", en: 'Organization name' },
  'auth.login_btn': { fr: 'Se connecter', en: 'Sign in' },
  'auth.register_btn': { fr: "Créer l'organisation", en: 'Create Organization' },
  'auth.no_account': { fr: 'Pas de compte ?', en: "Don't have an account?" },
  'auth.has_account': { fr: 'Déjà un compte ?', en: 'Already have an account?' },
  'auth.login_subtitle': { fr: 'Accédez à votre espace de planification', en: 'Access your planning workspace' },
  'auth.register_subtitle': { fr: 'Créez votre organisation et commencez à planifier', en: 'Create your organization and start planning' },
  'auth.loading': { fr: 'Chargement...', en: 'Loading...' },

  // SaaS Dashboard
  'saas.title': { fr: 'Tableau de bord Plateforme', en: 'Platform Dashboard' },
  'saas.subtitle': { fr: 'Vue d\'ensemble de toutes les organisations', en: 'Overview of all organizations' },
  'saas.total_tenants': { fr: 'Total Organisations', en: 'Total Tenants' },
  'saas.active_tenants': { fr: 'Organisations actives', en: 'Active Tenants' },
  'saas.total_users': { fr: 'Total Utilisateurs', en: 'Total Users' },
  'saas.total_roles': { fr: 'Total Rôles', en: 'Total Roles' },
  'saas.tenant_name': { fr: 'Organisation', en: 'Tenant' },
  'saas.status': { fr: 'Statut', en: 'Status' },
  'saas.created_at': { fr: 'Date de création', en: 'Created' },
  'saas.users_count': { fr: 'Utilisateurs', en: 'Users' },
  'saas.actions': { fr: 'Actions', en: 'Actions' },
  'saas.activate': { fr: 'Activer', en: 'Activate' },
  'saas.suspend': { fr: 'Suspendre', en: 'Suspend' },
  'saas.active': { fr: 'Actif', en: 'Active' },
  'saas.suspended': { fr: 'Suspendu', en: 'Suspended' },
  'saas.no_tenants': { fr: 'Aucune organisation trouvée', en: 'No tenants found' },

  // Dashboard
  'dashboard.welcome': { fr: 'Bienvenue', en: 'Welcome' },
  'dashboard.title': { fr: 'Tableau de bord', en: 'Dashboard' },
  'dashboard.overview': { fr: 'Vue d\'ensemble', en: 'Overview' },

  // Common
  'common.loading': { fr: 'Chargement...', en: 'Loading...' },
  'common.error': { fr: 'Erreur', en: 'Error' },
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.delete': { fr: 'Supprimer', en: 'Delete' },
  'common.edit': { fr: 'Modifier', en: 'Edit' },
  'common.search': { fr: 'Rechercher...', en: 'Search...' },
  'common.language': { fr: 'Langue', en: 'Language' },
  'common.french': { fr: 'Français', en: 'French' },
  'common.english': { fr: 'Anglais', en: 'English' },

  // Roles
  'role.saas_owner': { fr: 'Propriétaire SaaS', en: 'SaaS Owner' },
  'role.client_admin': { fr: 'Administrateur', en: 'Admin' },
  'role.client_manager': { fr: 'Gestionnaire', en: 'Manager' },
  'role.client_employee': { fr: 'Employé', en: 'Employee' },

  // App
  'app.name': { fr: 'PlanifyHub', en: 'PlanifyHub' },
  'app.tagline': { fr: 'Intelligence de planification', en: 'Planning Intelligence' },

  // Invitations
  'inv.title': { fr: 'Gestion des invitations', en: 'Invitation Management' },
  'inv.subtitle': { fr: 'Invitez des membres à rejoindre votre organisation', en: 'Invite members to join your organization' },
  'inv.new': { fr: 'Nouvelle invitation', en: 'New Invitation' },
  'inv.send': { fr: 'Créer l\'invitation', en: 'Create Invitation' },
  'inv.email': { fr: 'Adresse courriel', en: 'Email address' },
  'inv.role': { fr: 'Rôle', en: 'Role' },
  'inv.status': { fr: 'Statut', en: 'Status' },
  'inv.expires': { fr: 'Expire le', en: 'Expires' },
  'inv.created': { fr: 'Créée le', en: 'Created' },
  'inv.pending': { fr: 'En attente', en: 'Pending' },
  'inv.accepted': { fr: 'Acceptée', en: 'Accepted' },
  'inv.expired': { fr: 'Expirée', en: 'Expired' },
  'inv.copy_link': { fr: 'Copier le lien', en: 'Copy Link' },
  'inv.copied': { fr: 'Lien copié !', en: 'Link copied!' },
  'inv.no_invitations': { fr: 'Aucune invitation', en: 'No invitations' },
  'inv.success': { fr: 'Invitation créée avec succès', en: 'Invitation created successfully' },
  'inv.delete_confirm': { fr: 'Supprimer cette invitation ?', en: 'Delete this invitation?' },

  // Accept invitation
  'inv.accept_title': { fr: 'Rejoindre l\'organisation', en: 'Join Organization' },
  'inv.accept_subtitle': { fr: 'Vous avez été invité à rejoindre une organisation', en: 'You have been invited to join an organization' },
  'inv.accept_btn': { fr: 'Créer mon compte', en: 'Create my account' },
  'inv.invalid_token': { fr: 'Ce lien d\'invitation est invalide ou expiré', en: 'This invitation link is invalid or expired' },
  'inv.already_accepted': { fr: 'Cette invitation a déjà été acceptée', en: 'This invitation has already been accepted' },
} as const;

export type TranslationKey = keyof typeof translations;
