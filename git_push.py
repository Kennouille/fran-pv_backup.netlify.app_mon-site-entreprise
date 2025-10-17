import subprocess


def git_push():
    try:
        # Ajouter tous les fichiers modifiés
        result = subprocess.run(["git", "add", "."], check=True, capture_output=True, text=True)
        print(result.stdout)

        # Commiter les changements
        commit_message = "Automated commit"
        result = subprocess.run(["git", "commit", "-m", commit_message], check=True, capture_output=True, text=True)
        print(result.stdout)

        # Pousser les changements vers le dépôt distant
        result = subprocess.run(["git", "push", "origin", "main"], check=True, capture_output=True, text=True)
        print(result.stdout)

        print("Code pushed to GitHub successfully!")
    except subprocess.CalledProcessError as e:
        print(f"An error occurred: {e.stderr}")


if __name__ == "__main__":
    git_push()
