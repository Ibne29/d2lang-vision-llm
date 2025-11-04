# d2lang-vision-llm

# Objectif du projet

Ce projet met en œuvre un pipeline intelligent capable de générer automatiquement des diagrammes D2 à partir d’un prompt utilisateur en langage naturel.
Le pipeline utilise un modèle de langage Mistral (codestral) et un RAG (Retrieval-Augmented Generation) alimenté par la documentation officielle de D2lang.
L’objectif est de démontrer comment un LLM peut:

-comprendre une description textuelle (prompt),

-générer un code D2 valide,

-compiler ce code en image (.png),

-se corriger automatiquement en cas d’erreur,

-itérer jusqu’à produire un résultat exploitable



# Technologies utilisées

Node.js	: Environnement d’exécution du pipeline
Mistral API (codestral-latest) : Génération du code D2
D2lang	: Langage de description de diagrammes
RAG (via fetch)	: Téléchargement de la documentation officielle D2
dotenv	: Gestion sécurisée des clés API



# Exécution du pipeline

node pipeline.js "Deux clients parlent à un serveur et une base de données"
(On peut changer de prompt)

# Produit 
un fichier diagram.d2 avec le code généré,
une image diagram.png avec le diagramme compilé.
