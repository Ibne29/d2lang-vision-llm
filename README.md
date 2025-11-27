# d2lang-vision-llm

# Objectif du projet

Ce projet met en œuvre un pipeline intelligent capable de générer automatiquement des diagrammes D2 à partir d’un prompt utilisateur en langage naturel.

Le pipeline utilise un modèle de langage Mistral (Codestral) et un RAG (Retrieval-Augmented Generation) alimenté par la documentation officielle de D2lang.
Il intègre également un modèle Vision LLM (Pixtral), pour vérifier automatiquement la cohérence visuelle entre le texte et le diagramme généré.

# Le pipeline permet de : 

🧠 comprendre une description textuelle (prompt),

🧩 générer un code D2 valide,

⚙️ compiler ce code en image (.png),

👁️ analyser l’image générée avec un modèle vision (Pixtral),

🔍 mesurer la similarité sémantique prompt/image via embeddings,

🔁 se corriger et itérer automatiquement jusqu’à obtenir un résultat cohérent.



# Technologies utilisées


Node.js	: Environnement d’exécution du pipeline

RAG (via fetch)	: Téléchargement de la documentation officielle D2

Mistral API (codestral-latest) : Génération du code D2

D2lang	: Langage de description de diagrammes

Google API (Gemini) : Transformation de textes en embbedings 

dotenv	: Gestion sécurisée des clés API

HTML / JavaScript / CSS


# Exécution du pipeline (dans le terminal) :

Créer un .env à l'image de .env.example dans lequel il faut renseigner les deux clefs api (MISTRAL_API_KEY et GOOGLE_API_KEY)


node pipeline.js "Deux clients parlent à un serveur et une base de données"

(En remplaçant par votre prompt)

# Produit 

un fichier diagram.d2 avec le code généré,

une image diagram.png avec le diagramme compilé.



# Interface web temps réel

Une application web permet de visualiser les logs, les itérations et les images générées en direct.

Lancer le serveur:

node server.js ou npm start


# Fonctionnalités :

Saisie du prompt depuis le navigateur

Logs du pipeline affichés en direct 

Images des différentes itérations affichées au fur et à mesure

Statistiques de performance en temps réel (temps de génération, compilation, vision, embeddings)

Arrêt automatique une fois qu’un diagramme cohérent est obtenu (seuil de similarité : 0.90)